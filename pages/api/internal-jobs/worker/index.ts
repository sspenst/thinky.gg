import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
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

  // TODO: Find all messages that were in progress for more than 5 minutes and set them to PENDING if their attempts is less than 3
  // this would handle if the server crashed while processing a message

  // grab all PENDING messages
  const messages = await QueueMessageModel.findOneAndUpdate({ status: QueueMessageState.PENDING }, {
    state: QueueMessageState.PROCESSING,
    processingStartedAt: new Date(),
    processingAttempts: { $inc: 1 },
  }, { lean: true, new: true });

  for (const message of messages) {
    try {
      await processQueueMessage(message);
    } catch (e: any) {
      logger.error(e);
    }
  }
});
