import AchievementCategory from '@root/constants/achievements/achievementCategory';
import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getEnrichNotificationPipelineStages } from '@root/helpers/enrich';
import genLevelImage from '@root/helpers/genLevelImage';
import { checkIfBlocked } from '@root/helpers/getBlockedUserIds';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import isGuest from '@root/helpers/isGuest';
import { createNewLevelNotifications, createScheduledLevelPublishedNotification } from '@root/helpers/notificationHelper';
import { processDiscordMentions } from '@root/helpers/processDiscordMentions';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import mongoose, { Types } from 'mongoose';
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
  } else if (queueMessage.type === QueueMessageType.DISCORD_NOTIFICATION) {
    const { channelId, token, content, mentionUsernames } = JSON.parse(queueMessage.message) as {
      channelId: string;
      token: string;
      content: string;
      mentionUsernames: string[];
    };

    try {
      // Process Discord mentions if usernames are provided
      const processedContent = mentionUsernames.length > 0
        ? await processDiscordMentions(content, mentionUsernames)
        : content;

      // Send Discord webhook
      const webhookUrl = `https://discord.com/api/webhooks/${channelId}/${token}?wait=true`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: processedContent,
        }),
      });

      log = `Discord webhook ${channelId}: ${response.status} ${response.statusText}`;

      if (!response.ok) {
        error = true;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      log = `Discord webhook ${channelId}: ${e.message}`;
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

        const [userConfig, isBlocked] = await Promise.all([
          UserConfigModel.findOne<UserConfig>({ userId: notification.userId._id, gameId: notification.gameId }).lean<UserConfig>(),
          notification.source?._id ? checkIfBlocked(notification.userId._id.toString(), notification.source._id.toString()) : false
        ]);

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

          if (whereSend === sendEmailNotification && (disallowedEmail || isBlocked)) {
            const reason = disallowedEmail ? 'not allowed by user' : 'user blocked source';

            log = `Notification ${notificationId} not sent: ${notification.type} ${reason} (email)`;
          } else if (whereSend === sendPushNotification && (disallowedPush || isBlocked)) {
            const reason = disallowedPush ? 'not allowed by user' : 'user blocked source';

            log = `Notification ${notificationId} not sent: ${notification.type} ${reason} (push)`;
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

    const achievementsEarnedMap = await refreshAchievements(gameId, new Types.ObjectId(userId), categories);

    log = `refreshAchievements game ${gameId} for ${userId} created ${JSON.stringify(achievementsEarnedMap)} achievements`;
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
      await createNewLevelNotifications(lvl.gameId, new Types.ObjectId((lvl.userId as any)?._id || lvl.userId), lvl._id, undefined);
    }
  } else if (queueMessage.type === QueueMessageType.PUBLISH_LEVEL) {
    const { levelId } = JSON.parse(queueMessage.message) as { levelId: string };

    log = `publishLevel for ${levelId}`;

    try {
      // Import additional required models and helpers for publishing
      const { CacheModel, RecordModel, StatModel, UserConfigModel } = await import('../../../../models/mongoose');
      const { queueCalcCreatorCounts, queueCalcPlayAttempts, queueGenLevelImage, queueRefreshAchievements, queueRefreshIndexCalcs } = await import('./queueFunctions');
      const AchievementCategory = await import('@root/constants/achievements/achievementCategory');
      const { CacheTag } = await import('@root/models/db/cache');
      const { TimerUtil } = await import('../../../../helpers/getTs');

      const level = await LevelModel.findById(levelId).lean<Level>();

      if (!level) {
        log = `publishLevel for ${levelId} failed: level not found`;
        error = true;
      } else if (!level.isDraft) {
        log = `publishLevel for ${levelId} failed: level is not a draft`;
        error = true;
      } else {
        const ts = TimerUtil.getTs();

        // Remove the scheduled queue message ID from the level
        await LevelModel.findByIdAndUpdate(levelId, {
          $unset: { scheduledQueueMessageId: 1 },
          $set: {
            calc_stats_completed_count: 1,
            calc_stats_players_beaten: 1,
            isDraft: false,
            ts: ts,
          },
        });

        // Create user stats and records
        await Promise.all([
          UserConfigModel.findOneAndUpdate({ userId: level.userId, gameId: level.gameId }, {
            $inc: { calcLevelsSolvedCount: 1, calcLevelsCompletedCount: 1 },
          }),
          RecordModel.create({
            _id: new Types.ObjectId(),
            gameId: level.gameId,
            levelId: level._id,
            moves: level.leastMoves,
            ts: ts,
            userId: level.userId,
          }),
          StatModel.create({
            _id: new Types.ObjectId(),
            attempts: 1,
            complete: true,
            gameId: level.gameId,
            levelId: level._id,
            moves: level.leastMoves,
            ts: ts,
            userId: level.userId,
          }),
          // invalidate cache
          CacheModel.deleteMany({
            tag: CacheTag.SEARCH_API,
            gameId: level.gameId,
          }),
        ]);

        // Queue additional processing tasks
        await Promise.all([
          queueRefreshAchievements(level.gameId, level.userId, [AchievementCategory.default.CREATOR]),
          queueRefreshIndexCalcs(level._id),
          queueCalcPlayAttempts(level._id),
          queueCalcCreatorCounts(level.gameId, level.userId),
          queueGenLevelImage(level._id, true),
          createNewLevelNotifications(level.gameId, level.userId, level._id, undefined),
          createScheduledLevelPublishedNotification(level.gameId, level.userId, level._id, level.name),
        ]);

        log = `publishLevel for ${levelId} completed successfully`;
      }
    } catch (e: any) {
      log = `publishLevel for ${levelId} failed: ${e.message}`;
      error = true;
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

      if (!db) {
        throw new Error('processQueueMessages - Could not get db from mongoose connection');
      }

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
