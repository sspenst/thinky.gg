import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { GameId } from '@root/constants/GameId';
import QueueMessage from '@root/models/db/queueMessage';
import { QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { ClientSession, QueryOptions, Types } from 'mongoose';

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

export async function bulkQueuePushNotification(notificationIds: Types.ObjectId[], session: ClientSession, runAt?: Date, onlyPush: boolean = false) {
  const queueMessages = [];
  const now = new Date();
  const runAtTime = runAt || now;

  for (const notificationId of notificationIds) {
    const message = JSON.stringify({ notificationId: notificationId.toString() });

    queueMessages.push({
      _id: new Types.ObjectId(),
      dedupeKey: `push-${notificationId}`,
      message: message,
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUSH_NOTIFICATION,
      runAt: runAtTime,
      createdAt: now,
      updatedAt: now,
      processingAttempts: 0,
      isProcessing: false,
    });

    if (!onlyPush) {
      queueMessages.push({
        _id: new Types.ObjectId(),
        dedupeKey: `email-${notificationId}`,
        message: message,
        state: QueueMessageState.PENDING,
        type: QueueMessageType.EMAIL_NOTIFICATION,
        runAt: runAtTime,
        createdAt: now,
        updatedAt: now,
        processingAttempts: 0,
        isProcessing: false,
      });
    }
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

export async function queueDiscord(
  channelId: string,
  token: string,
  content: string,
  mentionUsernames?: string[],
  dedupeKey?: string,
  options?: QueryOptions
) {
  return queue(
    dedupeKey || `discord-${channelId}-${Date.now()}`,
    QueueMessageType.DISCORD_NOTIFICATION,
    JSON.stringify({
      channelId,
      token,
      content,
      mentionUsernames: mentionUsernames || [],
    }),
    options
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
  return queue(`${levelId.toString()}-queueGenLevelImage-${postToDiscord}`, QueueMessageType.GEN_LEVEL_IMAGE, JSON.stringify({
    levelId: levelId.toString(),
    postToDiscord,
  }), options);
}

export async function queuePublishLevel(levelId: Types.ObjectId, runAt: Date, options?: QueryOptions): Promise<Types.ObjectId> {
  const queueMessage = await QueueMessageModel.create({
    _id: new Types.ObjectId(),
    dedupeKey: `publish-level-${levelId.toString()}`,
    message: JSON.stringify({ levelId: levelId.toString() }),
    state: QueueMessageState.PENDING,
    type: QueueMessageType.PUBLISH_LEVEL,
    runAt: runAt,
    processingAttempts: 0,
    isProcessing: false,
    ...(options || {}),
  });

  return queueMessage._id;
}

/**
 * @param userIds
 * @param gameId
 * @param categories
 * @param options
 * @param spreadRunAtDuration How long to spread out the runAt times (in seconds).
 */
export async function bulkQueueRefreshAchievements(userIds: Types.ObjectId[], gameId: GameId, categories: AchievementCategory[], options?: QueryOptions, spreadRunAtDuration: number = 0) {
  const queueMessages = [];
  const now = new Date();
  const timeBetweenUsers = spreadRunAtDuration > 0 ? spreadRunAtDuration * 1000 / userIds.length : 0;

  for (const userId of userIds) {
    const runAtTime: Date = new Date(now.getTime() + timeBetweenUsers * queueMessages.length);

    queueMessages.push({
      _id: new Types.ObjectId(),
      dedupeKey: userId.toString() + '-refresh-achievements-batch-' + new Types.ObjectId().toString(),
      message: JSON.stringify({ gameId: gameId, userId: userId.toString(), categories: categories }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.REFRESH_ACHIEVEMENTS,
      runAt: runAtTime,
      createdAt: now,
      updatedAt: now,
      processingAttempts: 0,
      isProcessing: false,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await QueueMessageModel.insertMany(queueMessages, { ...options as any });
}

export interface EmailQueueMessage {
    toUser: Types.ObjectId | string;
    fromUser: Types.ObjectId | string;
    subject: string;
    text: string;
  }
