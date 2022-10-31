import { ObjectId } from 'bson';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import { QueueMessage, QueueMessageState, QueueMessageType } from '../../../../models/db/queueMessage';
import { QueueMessageModel } from '../../../../models/mongoose';

export async function queueFetch(url: string, options: RequestInit) {
  const queueMessage: QueueMessage = await QueueMessageModel.create<QueueMessage>({
    type: QueueMessageType.FETCH,
    state: QueueMessageState.PENDING,
    message: JSON.stringify({ url, options }),
  });

  return queueMessage._id;
}

async function processQueueMessage(queueMessage: QueueMessage) {
  let log = '';
  let error = false;

  if (queueMessage.type === QueueMessageType.FETCH) {
    const { url, options } = JSON.parse(queueMessage.message) as { url: string, options: RequestInit };
    const response = await fetch(url, options);

    log = `${url}: ${response.status} ${response.statusText}`;

    if (response.status !== 200) {
      error = true;
    }
  }

  /////

  let state = QueueMessageState.COMPLETED;

  if (error) {
    state = QueueMessageState.PENDING;

    if (queueMessage.processingAttempts >= 3) {
      state = QueueMessageState.FAILED;
    }
  }

  await QueueMessageModel.updateOne({ _id: queueMessage._id }, {
    state: state,
    processingCompletedAt: new Date(),
    log: {
      $push: log,
    }
  });
}

export default apiWrapper({ GET: {
  query: {
    secret: ValidType('string', true)
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret } = req.query;

  if (secret !== process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();
  // Find all messages that were in progress for more than 5 minutes and set them to PENDING if their attempts is less than 3
  await QueueMessageModel.updateMany({
    state: QueueMessageState.PROCESSING,
    processingStartedAt: {
      $lt: new Date(new Date().getTime() - 5 * 60 * 1000)
    },
    processingAttempts: {
      $lt: 3
    }
  }, {
    state: QueueMessageState.PENDING,
  });

  // this would handle if the server crashed while processing a message

  const genJobRunId = new ObjectId();
  // grab all PENDING messages
  const updateResult = await QueueMessageModel.updateMany({ status: QueueMessageState.PENDING }, {
    jobRunId: genJobRunId,
    state: QueueMessageState.PROCESSING,
    processingStartedAt: new Date(),
    $inc: {
      processingAttempts: 1,
    }
  }, { lean: true });

  if (updateResult.modifiedCount === 0) {
    return res.status(200).json({ message: 'No messages to process' });
  }

  const messages = await QueueMessageModel.find({ jobRunId: genJobRunId });

  const promises = [];

  for (const message of messages) {
    try {
      promises.push(processQueueMessage(message));
    } catch (e: any) {
      logger.error(e);
    }
  }

  await Promise.all(promises);
});
