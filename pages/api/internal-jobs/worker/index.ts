import { ObjectId } from 'bson';
import mongoose, { QueryOptions, SaveOptions } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import QueueMessage from '../../../../models/db/queueMessage';
import { QueueMessageModel } from '../../../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../../../models/schemas/levelSchema';
import { QueueMessageState, QueueMessageType } from '../../../../models/schemas/queueMessageSchema';

const MAX_PROCESSING_ATTEMPTS = 3;

export async function queue(messageModelPromise: Promise<QueueMessage[]>) {
  try {
    await messageModelPromise;
  } catch (e: unknown) {
    //if (e.code === 11000) // is the duplicate error
    // ignore logging here... This is a good error means we are preventing duplicate jobs with dedupe key
  }
}

export async function queueFetch(url: string, options: RequestInit, dedupeKey?: string) {
  await queue(QueueMessageModel.create<QueueMessage>({
    dedupeKey: dedupeKey || new ObjectId().toString(), // don't depupe
    type: QueueMessageType.FETCH,
    state: QueueMessageState.PENDING,
    message: JSON.stringify({ url, options }),
  }));
}

export async function queueRefreshIndexCalcs(lvlId: ObjectId, options?: SaveOptions | undefined) {
  await queue(QueueMessageModel.create<QueueMessage>([{
    dedupeKey: lvlId.toString(),
    type: QueueMessageType.REFRESH_INDEX_CALCULATIONS,
    state: QueueMessageState.PENDING,
    message: JSON.stringify({ levelId: lvlId.toString() }),
  }], options));
}

export async function queueCalcPlayAttempts(lvlId: ObjectId, options?: SaveOptions | undefined) {
  await queue(QueueMessageModel.create<QueueMessage>([{
    dedupeKey: lvlId.toString(),
    type: QueueMessageType.CALC_PLAY_ATTEMPTS,
    state: QueueMessageState.PENDING,
    message: JSON.stringify({ levelId: lvlId.toString() }),
  }], options));
}

////
async function processQueueMessage(queueMessage: QueueMessage) {
  let log = '';
  let error = false;

  if (queueMessage.type === QueueMessageType.FETCH) {
    const { url, options } = JSON.parse(queueMessage.message) as { url: string, options: RequestInit };

    try {
      const response = await fetch(url, options);

      log = `${url}: ${response.status} ${response.statusText}`;

      // check if we got any 2xx response
      if (!response.ok) {
        error = true;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      log = `${url}: ${e.message}`;
      error = true;
    }
  }
  else if (queueMessage.type === QueueMessageType.REFRESH_INDEX_CALCULATIONS) {
    const { levelId } = JSON.parse(queueMessage.message) as { levelId: string };

    log = 'refreshed index calculations for ' + levelId;
    await refreshIndexCalcs(new ObjectId(levelId));
  }
  else if (queueMessage.type === QueueMessageType.CALC_PLAY_ATTEMPTS) {
    const { levelId } = JSON.parse(queueMessage.message) as { levelId: string };

    log = 'calc play attempts for ' + levelId;
    await calcPlayAttempts(new ObjectId(levelId));
  }

  /////

  let state = QueueMessageState.COMPLETED;

  if (error) {
    state = QueueMessageState.PENDING;

    if (queueMessage.processingAttempts >= MAX_PROCESSING_ATTEMPTS ) {
      state = QueueMessageState.FAILED;
    }
  }

  await QueueMessageModel.updateOne({ _id: queueMessage._id }, {
    isProcessing: false,
    state: state,
    processingCompletedAt: new Date(),
    $push: {
      log: log,
    }
  });

  return error;
}

export async function processQueueMessages() {
  await dbConnect();

  // this would handle if the server crashed while processing a message
  await QueueMessageModel.updateMany({
    state: QueueMessageState.PENDING,
    isProcessing: true,
    processingStartedAt: { $lt: new Date(Date.now() - 1000 * 60 * 5) }, // 5 minutes
  }, {
    isProcessing: false,
  });

  const genJobRunId = new ObjectId();
  // grab all PENDING messages
  const session = await mongoose.startSession();
  let found = true;
  let findItems: QueueMessage[] = [];

  try {
    await session.withTransaction(async () => {
      findItems = await QueueMessageModel.find({
        state: QueueMessageState.PENDING,
        processingAttempts: {
          $lt: MAX_PROCESSING_ATTEMPTS
        },
        isProcessing: false,
      }, {
      }, { session: session, lean: true, limit: 10, sort: { priority: -1, createdAt: 1 }
      });

      if (findItems.length === 0) {
        found = false;

        return;
      }

      const updateResult = await QueueMessageModel.updateMany({
        _id: { $in: findItems.map(x => x._id) },
      }, {
        jobRunId: genJobRunId,
        isProcessing: true,
        processingStartedAt: new Date(),
        $inc: {
          processingAttempts: 1,
        }
      }, { session: session, lean: true, sort: { priority: -1, createdAt: 1 }
      });

      if (updateResult.modifiedCount === 0) {
        found = false;
      }
    });
  } catch (e: unknown) {
    logger.error(e);
    session.endSession();
  }

  if (!found || findItems.length === 0) {
    return 'NONE';
  }

  // Must query items again unfortunately since their processingAttempts has incremented
  // Hypothetically, if we are OK with using 'old' versions of these items (before processingAttempts have been increments or isProcessing was set to true)
  // We can remove this query and change the above MAX_MESSAGES check to MAX_MESSAGES-1 and it'll still work...
  const itemsAfterUpdate = await QueueMessageModel.find({
    jobRunId: genJobRunId,
  }, {
  }, { lean: true, sort: { priority: -1, createdAt: 1 }
  });
  const promises = [];

  for (const message of itemsAfterUpdate) {
    promises.push(processQueueMessage(message));
  }

  const results = await Promise.all(promises); // results is an array of booleans
  const errors = results.filter(r => r);

  return `Processed ${promises.length} messages with ` + (errors.length > 0 ? `${errors.length} errors` : 'no errors');
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

  const result = await processQueueMessages();

  return res.status(200).json({ message: result });
});
