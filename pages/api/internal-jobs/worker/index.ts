import UserConfig from '@root/models/db/userConfig';
import mongoose, { QueryOptions, Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { getEnrichNotificationPipelineStages } from '../../../../helpers/enrich';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import Notification from '../../../../models/db/notification';
import QueueMessage from '../../../../models/db/queueMessage';
import { NotificationModel, QueueMessageModel, UserConfigModel } from '../../../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../../../models/schemas/levelSchema';
import { QueueMessageState, QueueMessageType } from '../../../../models/schemas/queueMessageSchema';
import { calcCreatorCounts, USER_DEFAULT_PROJECTION } from '../../../../models/schemas/userSchema';
import { sendEmailNotification } from './sendEmailNotification';
import { sendPushNotification } from './sendPushNotification';

const MAX_PROCESSING_ATTEMPTS = 3;

export async function queue(dedupeKey: string, type: QueueMessageType, message: string, options?: QueryOptions) {
  await QueueMessageModel.updateOne<QueueMessage>({
    dedupeKey: dedupeKey,
    message: message,
    state: QueueMessageState.PENDING,
    type: type,
  }, {
    dedupeKey: dedupeKey,
    message: message,
    state: QueueMessageState.PENDING,
    type: type,
  }, {
    upsert: true,
    ...options,
  });
}

export interface EmailQueueMessage {
  toUser: Types.ObjectId | string;
  fromUser: Types.ObjectId | string;
  subject: string;
  text: string;
}

export async function queuePushNotification(notificationId: Types.ObjectId, options?: QueryOptions) {
  const message = JSON.stringify({ notificationId: notificationId.toString() });

  await Promise.all([
    queue(
      `push-${notificationId.toString()}`,
      QueueMessageType.PUSH_NOTIFICATION,
      message,
      options,
    ),
    queue(
      `email-${notificationId.toString()}`,
      QueueMessageType.EMAIL_NOTIFICATION,
      message,
      options,
    )
  ]);
}

export async function queueFetch(url: string, options: RequestInit, dedupeKey?: string, queryOptions?: QueryOptions) {
  await queue(
    dedupeKey || new Types.ObjectId().toString(),
    QueueMessageType.FETCH,
    JSON.stringify({ url, options }),
    queryOptions,
  );
}

export async function queueRefreshIndexCalcs(levelId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    levelId.toString(),
    QueueMessageType.REFRESH_INDEX_CALCULATIONS,
    JSON.stringify({ levelId: levelId.toString() }),
    options,
  );
}

export async function queueCalcPlayAttempts(levelId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    levelId.toString(),
    QueueMessageType.CALC_PLAY_ATTEMPTS,
    JSON.stringify({ levelId: levelId.toString() }),
    options,
  );
}

export async function queueCalcCreatorCounts(userId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    userId.toString(),
    QueueMessageType.CALC_CREATOR_COUNTS,
    JSON.stringify({ userId: userId.toString() }),
    options,
  );
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
  } else if (queueMessage.type === QueueMessageType.PUSH_NOTIFICATION || queueMessage.type === QueueMessageType.EMAIL_NOTIFICATION) {
    try {
      const { notificationId } = JSON.parse(queueMessage.message) as { notificationId: string };

      const notificationAgg = await NotificationModel.aggregate<Notification>([
        { $match: { _id: new Types.ObjectId(notificationId) } },
        ...getEnrichNotificationPipelineStages(),
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userId',
            pipeline: [
              {
                $project: {
                  ...USER_DEFAULT_PROJECTION,
                  email: 1,
                }
              }
            ]
          },
        },
        {
          $unwind: {
            path: '$userId',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      if (notificationAgg.length !== 1) {
        log = `Notification ${notificationId} not sent: not found`;
      } else {
        const notification = notificationAgg[0];

        const whereSend = queueMessage.type === QueueMessageType.PUSH_NOTIFICATION ? sendPushNotification : sendEmailNotification;
        const userConfig = await UserConfigModel.findOne({ userId: notification.userId._id }) as UserConfig;

        if (userConfig === null) {
          log = `Notification ${notificationId} not sent: user config not found`;
          error = true;
        } else {
          const allowedEmail = userConfig.emailNotificationsList.includes(notification.type);
          const allowedPush = userConfig.pushNotificationsList.includes(notification.type);

          if (whereSend === sendEmailNotification && !allowedEmail) {
            log = `Notification ${notificationId} not sent: ` + notification.type + ' not allowed by user (email)';
          } else if (whereSend === sendPushNotification && !allowedPush) {
            log = `Notification ${notificationId} not sent: ` + notification.type + ' not allowed by user (push)';
          } else {
            log = await whereSend(notification);
          }
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      log = `${e.message}`;
      error = true;
    }
  } else if (queueMessage.type === QueueMessageType.REFRESH_INDEX_CALCULATIONS) {
    const { levelId } = JSON.parse(queueMessage.message) as { levelId: string };

    log = `refreshIndexCalcs for ${levelId}`;
    await refreshIndexCalcs(new Types.ObjectId(levelId));
  } else if (queueMessage.type === QueueMessageType.CALC_PLAY_ATTEMPTS) {
    const { levelId } = JSON.parse(queueMessage.message) as { levelId: string };

    log = `calcPlayAttempts for ${levelId}`;
    await calcPlayAttempts(new Types.ObjectId(levelId));
  } else if (queueMessage.type === QueueMessageType.CALC_CREATOR_COUNTS) {
    const { userId } = JSON.parse(queueMessage.message) as { userId: string };

    log = `calcCreatorCounts for ${userId}`;
    await calcCreatorCounts(new Types.ObjectId(userId));
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

  const genJobRunId = new Types.ObjectId();
  // grab all PENDING messages
  const session = await mongoose.startSession();
  let found = true;
  let queueMessages: QueueMessage[] = [];

  try {
    await session.withTransaction(async () => {
      queueMessages = await QueueMessageModel.find({
        state: QueueMessageState.PENDING,
        processingAttempts: {
          $lt: MAX_PROCESSING_ATTEMPTS
        },
        isProcessing: false,
      }, {}, {
        session: session,
        lean: true,
        limit: 10,
        sort: { priority: -1, createdAt: 1 },
      });

      if (queueMessages.length === 0) {
        found = false;

        return;
      }

      const processingStartedAt = new Date();

      await QueueMessageModel.updateMany({
        _id: { $in: queueMessages.map(x => x._id) },
      }, {
        jobRunId: genJobRunId,
        isProcessing: true,
        processingStartedAt: processingStartedAt,
        $inc: {
          processingAttempts: 1,
        },
      }, { session: session, lean: true });

      // manually update queueMessages so we don't have to query again
      queueMessages.forEach(message => {
        message.jobRunId = genJobRunId as Types.ObjectId;
        message.isProcessing = true;
        message.processingStartedAt = processingStartedAt;
        message.processingAttempts += 1;
      });
    });
    session.endSession();
  } catch (e: unknown) {
    logger.error(e);
    session.endSession();
  }

  if (!found || queueMessages.length === 0) {
    return 'NONE';
  }

  const promises = [];

  for (const message of queueMessages) {
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
