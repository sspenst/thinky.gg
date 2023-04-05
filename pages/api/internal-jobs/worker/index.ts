import admin from 'firebase-admin';
import mongoose, { QueryOptions, Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { getEnrichNotificationPipelineStages } from '../../../../helpers/enrich';
import getMobileNotification from '../../../../helpers/getMobileNotification';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import Device from '../../../../models/db/device';
import Notification from '../../../../models/db/notification';
import QueueMessage from '../../../../models/db/queueMessage';
import { DeviceModel, NotificationModel, QueueMessageModel } from '../../../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../../../models/schemas/levelSchema';
import { QueueMessageState, QueueMessageType } from '../../../../models/schemas/queueMessageSchema';
import { calcCreatorCounts } from '../../../../models/schemas/userSchema';

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

export async function queuePushNotification(notificationId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    notificationId.toString(),
    QueueMessageType.PUSH_NOTIFICATION,
    JSON.stringify({ notificationId: notificationId.toString() }),
    options,
  );
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
  } else if (queueMessage.type === QueueMessageType.PUSH_NOTIFICATION) {
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
        const devices = await DeviceModel.find({ userId: notification.userId._id });

        if (devices.length === 0) {
          log = `Notification ${notificationId} not sent: no devices found`;
        } else {
          const mobileNotification = getMobileNotification(notification);
          const tokens = devices.map((token: Device) => token.deviceToken);

          if (!global.firebaseApp) {
            global.firebaseApp = admin.initializeApp({
              credential: admin.credential.cert({
                'client_email': process.env.FIREBASE_CLIENT_EMAIL,
                'private_key': process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                'project_id': process.env.FIREBASE_PROJECT_ID,
              } as admin.ServiceAccount),
            });
          }

          const res = await global.firebaseApp.messaging().sendMulticast({
            tokens: tokens,
            data: {
              notificationId: notification._id.toString(),
              url: mobileNotification.url,
            },
            notification: {
              title: mobileNotification.title,
              body: mobileNotification.body,
              imageUrl: mobileNotification.imageUrl,
            },
            apns: {
              payload: {
                aps: {
                  'mutable-content': 1,
                  'content-available': 1,
                },
                notifee_options: {
                  data: {
                    notificationId: notification._id.toString(),
                    url: mobileNotification.url,
                  },
                  image: mobileNotification.imageUrl,
                },
              },
            },
            android: {
              notification: {
                imageUrl: mobileNotification.imageUrl,
              },
            },
          });
          const responseJSON = JSON.stringify(res);

          log = `${responseJSON}`;
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
