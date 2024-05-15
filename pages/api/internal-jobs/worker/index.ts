import AchievementCategory from '@root/constants/achievements/achievementCategory';
import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getEnrichNotificationPipelineStages } from '@root/helpers/enrich';
import genLevelImage from '@root/helpers/genLevelImage';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isGuest from '@root/helpers/isGuest';
import { createNewLevelNotifications } from '@root/helpers/notificationHelper';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import mongoose, { ClientSession, QueryOptions, Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect, { dbDisconnect } from '../../../../lib/dbConnect';
import Notification from '../../../../models/db/notification';
import QueueMessage from '../../../../models/db/queueMessage';
import { LevelModel, NotificationModel, QueueMessageModel, UserConfigModel, UserModel } from '../../../../models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '../../../../models/schemas/levelSchema';
import { QueueMessageState, QueueMessageType } from '../../../../models/schemas/queueMessageSchema';
import { calcCreatorCounts } from '../../../../models/schemas/userSchema';
import { sendEmailNotification } from './sendEmailNotification';
import { sendPushNotification } from './sendPushNotification';

const MAX_PROCESSING_ATTEMPTS = 3;

export async function queue(dedupeKey: string, type: QueueMessageType, message: string, options?: QueryOptions, runAt?: Date) {
  await QueueMessageModel.updateOne<QueueMessage>({
    dedupeKey: dedupeKey,
    message: message,
    state: QueueMessageState.PENDING,
    type: type,
  }, {
    runAt: runAt || new Date(),
    dedupeKey: dedupeKey,
    message: message,
    state: QueueMessageState.PENDING,
    type: type,
  }, {
    upsert: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...options as any,
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

export async function bulkQueuePushNotification(notificationIds: Types.ObjectId[], session: ClientSession) {
  const queueMessages = [];

  for (const notificationId of notificationIds) {
    const message = JSON.stringify({ notificationId: notificationId.toString() });

    queueMessages.push({
      _id: new Types.ObjectId(),
      dedupeKey: `push-${notificationId}`,
      message: message,
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUSH_NOTIFICATION,
    });

    queueMessages.push({
      _id: new Types.ObjectId(),
      dedupeKey: `email-${notificationId}`,
      message: message,
      state: QueueMessageState.PENDING,
      type: QueueMessageType.EMAIL_NOTIFICATION,
    });
  }

  await QueueMessageModel.insertMany(queueMessages, { session: session });
}

export async function queueRefreshAchievements(gameId: GameId, userId: string | Types.ObjectId, categories: AchievementCategory[], options?: QueryOptions) {
  await queue(
    userId.toString() + '-refresh-achievements-' + new Types.ObjectId().toString(),
    QueueMessageType.REFRESH_ACHIEVEMENTS,
    JSON.stringify({ gameId: gameId, userId: userId.toString(), categories: categories }),
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

/**
 *
 * @param levelIds
 * @param options
 * @param spreadRunAtDuration How long to spread out the runAt times (in seconds).
 */
export async function bulkQueueCalcPlayAttempts(levelIds: Types.ObjectId[], options?: QueryOptions, spreadRunAtDuration: number = 0) {
  const queueMessages = [];
  const now = new Date();
  const timeBetweenLevels = spreadRunAtDuration > 0 ? spreadRunAtDuration * 1000 / levelIds.length : 0;

  for (const levelId of levelIds) {
    const runAtTime: Date = new Date(now.getTime() + timeBetweenLevels * queueMessages.length);

    queueMessages.push({
      _id: new Types.ObjectId(),
      dedupeKey: levelId.toString(),
      message: JSON.stringify({ levelId: levelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.CALC_PLAY_ATTEMPTS,
      runAt: runAtTime,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await QueueMessageModel.insertMany(queueMessages, { ...options as any });
}

export async function queueRefreshIndexCalcs(levelId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    levelId.toString(),
    QueueMessageType.REFRESH_INDEX_CALCULATIONS,
    JSON.stringify({ levelId: levelId.toString() }),
    options,
  );
}

export async function queueCalcPlayAttempts(levelId: Types.ObjectId, options?: QueryOptions, runAt?: Date) {
  await queue(
    levelId.toString(),
    QueueMessageType.CALC_PLAY_ATTEMPTS,
    JSON.stringify({ levelId: levelId.toString() }),
    options,
    runAt,
  );
}

export async function queueCalcCreatorCounts(gameId: GameId, userId: Types.ObjectId, options?: QueryOptions) {
  await queue(
    userId.toString(),
    QueueMessageType.CALC_CREATOR_COUNTS,
    JSON.stringify({ userId: userId.toString(), gameId: gameId }),
    options,
  );
}

export async function queueGenLevelImage(levelId: Types.ObjectId, postToDiscord: boolean, options?: QueryOptions) {
  await queue(
    levelId.toString() + '-queueGenLevelImage-' + postToDiscord,
    QueueMessageType.GEN_LEVEL_IMAGE,
    JSON.stringify({ levelId: levelId.toString(), postToDiscord: postToDiscord }),
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
            from: UserModel.collection.name,
            localField: 'userId',
            foreignField: '_id',
            as: 'userId',
            pipeline: [
              {
                $project: {
                  ...USER_DEFAULT_PROJECTION,
                  email: 1,
                  emailConfirmed: 1,
                  disallowedEmailNotifications: 1,
                  disallowedPushNotifications: 1,
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

        const userConfig = await UserConfigModel.findOne<UserConfig>({ userId: notification.userId._id, gameId: notification.gameId }).lean<UserConfig>();

        if (userConfig === null) {
          log = `Notification ${notificationId} not sent: user config not found`;
          error = true;
        } else if (isGuest(notification.userId as User)) {
          log = `Notification ${notificationId} not sent: user is guest`;
          error = true;
        } else {
          const whereSend = queueMessage.type === QueueMessageType.PUSH_NOTIFICATION ? sendPushNotification : sendEmailNotification;

          const disallowedEmail = (notification.userId as User).disallowedEmailNotifications?.includes(notification.type);
          const disallowedPush = (notification.userId as User).disallowedPushNotifications?.includes(notification.type);

          if (whereSend === sendEmailNotification && disallowedEmail) {
            log = `Notification ${notificationId} not sent: ${notification.type} not allowed by user (email)`;
          } else if (whereSend === sendPushNotification && disallowedPush) {
            log = `Notification ${notificationId} not sent: ${notification.type} not allowed by user (push)`;
          } else {
            log = await whereSend(userConfig.gameId, notification);
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
    const { userId, gameId } = JSON.parse(queueMessage.message) as { userId: string, gameId: GameId };

    log = `calcCreatorCounts for ${userId}`;
    await calcCreatorCounts(gameId, new Types.ObjectId(userId));
  } else if (queueMessage.type === QueueMessageType.REFRESH_ACHIEVEMENTS) {
    const { gameId, userId, categories } = JSON.parse(queueMessage.message) as {gameId: GameId, userId: string, categories: AchievementCategory[]};

    const achievementsEarned = await refreshAchievements(gameId, new Types.ObjectId(userId), categories);

    log = `refreshAchievements game ${gameId} for ${userId} created ${achievementsEarned} achievements`;
  } else if (queueMessage.type === QueueMessageType.GEN_LEVEL_IMAGE) {
    const { levelId, postToDiscord } = JSON.parse(queueMessage.message) as { levelId: string, postToDiscord: boolean };

    log = `genLevelImage for ${levelId}`;
    const levelAgg = await LevelModel.aggregate<Level>([
      { $match: { _id: new Types.ObjectId(levelId) } },
      { $lookup: { from: UserModel.collection.name, localField: 'userId', foreignField: '_id', as: 'userId' } },
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } }
    ]).exec();

    const lvl = levelAgg.length > 0 ? levelAgg[0] : null;

    if (!lvl) {
      log = `genLevelImage for ${levelId} failed: level not found`;
      error = true;
    } else {
      await genLevelImage(lvl);

      if (postToDiscord) {
        const game = getGameFromId(lvl.gameId);
        const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathLevels : DiscordChannel.PathologyLevels;

        await queueDiscordWebhook(discordChannel, `**${lvl.userId?.name}** published a new level: [${lvl.name}](${game.baseUrl}/level/${lvl.slug}?ts=${lvl.ts})`);
      }

      // Need to create the new level notification because technically the image needs to be generated beforehand...
      await createNewLevelNotifications(lvl.gameId, new Types.ObjectId(lvl.userId._id), lvl._id, undefined);
    }
  } else {
    log = `Unknown queue message type ${queueMessage.type}`;
    error = true;
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
  try {
    await QueueMessageModel.updateMany({
      state: QueueMessageState.PENDING,
      isProcessing: true,
      processingStartedAt: { $lt: new Date(Date.now() - 1000 * 60 * 5) }, // 5 minutes
    }, {
      isProcessing: false,
    });
  } catch (e: unknown) {
    console.log('CAUGHT IT!!!');
    logger.error(e);
    console.log('About to try catch');

    try {
      const db = mongoose.connection.db;

      // reconnect to db
      console.log('disconnecting');
      await dbDisconnect(true);
      console.log('disconnected. connecting');
      await dbConnect();
      console.log('connected. validating');
      const whatever = await db.command({ validate: QueueMessageModel.collection.name });

      console.log('] VALIDATE DONE. PRINTING [');
      console.log(whatever);
    } catch (e: unknown) {
      //const allMessages = await QueueMessageModel.find().lean<QueueMessage[]>();

      console.log('VALIDATE FAILED. PRINTING', e);
      //console.log(allMessages.map(x => x.message));
      //console.log(e);
    }

    console.log('] PRINTING DONE.');
    console.trace('WHAT THE HELL');
  }

  const genJobRunId = new Types.ObjectId();
  // grab all PENDING messages
  const session = await mongoose.startSession();
  let found = true;
  let queueMessages: QueueMessage[] = [];

  try {
    await session.withTransaction(async () => {
      queueMessages = await QueueMessageModel.find({
        // where runAt is in the past (or undefined)
        $or: [
          { runAt: { $lte: new Date() } },
          { runAt: { $exists: false } }, // TODO: can delete this after a few moments after first deploy since all future messages will have runAt
        ],
        state: QueueMessageState.PENDING,
        processingAttempts: {
          $lt: MAX_PROCESSING_ATTEMPTS
        },
        isProcessing: false,
      }, {}, {
        session: session,
        limit: 20,
        sort: { priority: -1, createdAt: 1 },
      }).lean<QueueMessage[]>();

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
      }, { session: session }).lean();

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
