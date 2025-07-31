import { getDifficultyFromEstimate } from '@root/components/formatted/formattedDifficulty';
import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import Device from '@root/models/db/device';
import User from '@root/models/db/user';
import UserConfig from '@root/models/db/userConfig';
import { DeviceModel, NotificationModel, PlayAttemptModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { DeviceState } from '@root/models/schemas/deviceSchema';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import { getStreak } from '../../../../lib/cleanUser';
import dbConnect from '../../../../lib/dbConnect';
import { getLevelOfDay } from '../../level-of-day';
import { bulkQueuePushNotification } from '../worker/queueFunctions';

interface UserWithDeviceAndActivity extends User {
  devices: Device[];
  config?: UserConfig;
  lastMonthActivity: {
    hourOfDay: number;
    count: number;
  }[];
  todayLevelOfDayNotificationIds: Types.ObjectId[];
}

async function findEligibleUsers(): Promise<UserWithDeviceAndActivity[]> {
  const today = new Date();

  today.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = today.getUTCDay();
  const oneMonthAgo = new Date();

  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  // Find users who:
  // 1. Have active devices (state != INACTIVE)
  // 2. Haven't received a LEVEL_OF_DAY notification today
  // 3. Have level of day push notifications enabled
  const users = await UserModel.aggregate<UserWithDeviceAndActivity>([
    {
      $match: {
        // Check if LEVEL_OF_DAY is NOT in disallowedPushNotifications
        disallowedPushNotifications: { $ne: NotificationType.LEVEL_OF_DAY },
      }
    },
    // Look up user's devices
    {
      $lookup: {
        from: DeviceModel.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'devices',
        pipeline: [
          {
            $match: {
              state: { $ne: DeviceState.INACTIVE }
            }
          }
        ]
      }
    },
    // Only keep users with active devices
    {
      $match: {
        'devices.0': { $exists: true }
      }
    },
    // Look up user's config for streak information
    {
      $lookup: {
        from: UserConfigModel.collection.name,
        localField: '_id',
        foreignField: 'userId',
        as: 'config',
        pipeline: [
          {
            $project: {
              calcCurrentStreak: 1,
              lastPlayedAt: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        config: { $arrayElemAt: ['$config', 0] }
      }
    },
    // Check if they've already received a level of day notification today
    {
      $lookup: {
        from: NotificationModel.collection.name,
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  { $eq: ['$type', NotificationType.LEVEL_OF_DAY] },
                  { $gte: ['$createdAt', today] }
                ]
              }
            }
          },
          {
            $project: { _id: 1 }
          }
        ],
        as: 'todayLevelOfDayNotificationIds'
      }
    },
    // Only keep users who haven't received today's notification
    {
      $match: {
        'todayLevelOfDayNotificationIds.0': { $exists: false }
      }
    },
    // Get their play activity for the last month on the current day of week
    {
      $lookup: {
        from: PlayAttemptModel.collection.name,
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  { $gte: ['$startTime', oneMonthAgo.getTime() / 1000] },
                  { $eq: [{ $dayOfWeek: { $toDate: { $multiply: ['$startTime', 1000] } } }, dayOfWeek + 1] } // MongoDB dayOfWeek is 1-7, JS is 0-6
                ]
              }
            }
          },
          {
            $project: {
              hourOfDay: { $hour: { $toDate: { $multiply: ['$startTime', 1000] } } }
            }
          },
          {
            $group: {
              _id: '$hourOfDay',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              hourOfDay: '$_id',
              count: 1
            }
          },
          {
            $sort: { count: -1 }
          }
        ],
        as: 'lastMonthActivity'
      }
    }
  ]);

  return users;
}

function determineOptimalSendTime(user: UserWithDeviceAndActivity): Date {
  const now = new Date();
  const maxHoursAhead = 12; // Maximum 12 hours in the future to keep notifications relevant

  // If they have activity data, use the most active hour
  if (user.lastMonthActivity && user.lastMonthActivity.length > 0) {
    const mostActiveHour = user.lastMonthActivity[0].hourOfDay;
    const sendTime = new Date();

    sendTime.setUTCHours(mostActiveHour, 0, 0, 0);

    // If the time has already passed today, send within the next 3 hours instead
    // This ensures we send today's level of the day, not tomorrow's
    if (sendTime <= now) {
      const randomMinutes = Math.floor(Math.random() * 180); // 0-180 minutes

      return new Date(now.getTime() + randomMinutes * 60 * 1000);
    }

    // If the optimal time is too far in the future (>12 hours), send within 3 hours instead
    // This prevents scheduling 22+ hours ahead when it's early morning and user is active at night
    const hoursUntilOptimal = (sendTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilOptimal > maxHoursAhead) {
      const randomMinutes = Math.floor(Math.random() * 180); // 0-180 minutes

      return new Date(now.getTime() + randomMinutes * 60 * 1000);
    }

    return sendTime;
  }

  // No activity data - schedule randomly over the next 3 hours
  const randomMinutes = Math.floor(Math.random() * 180); // 0-180 minutes
  const sendTime = new Date(now.getTime() + randomMinutes * 60 * 1000);

  return sendTime;
}

function createLevelOfDayMessage(level: any, gameDisplayName: string, userConfig?: UserConfig): string {
  const difficultyEstimate = level.calc_difficulty_completion_estimate ?? level.calc_difficulty_estimate ?? -1;
  const difficulty = getDifficultyFromEstimate(difficultyEstimate);

  // Create an engaging message with level name and difficulty
  const difficultyText = difficulty.name !== 'Pending'
    ? `${difficulty.emoji} ${difficulty.name}`
    : '⏳ New';

  // Get streak information if available
  let streakText = '';

  if (userConfig) {
    const { streak, timeToKeepStreak } = getStreak(userConfig);

    if (streak > 0) {
      if (timeToKeepStreak > 0) {
        // User has a streak but hasn't played today
        streakText = `🔥 Keep your ${streak}-day streak alive! `;
      } else {
        // User already played today
        streakText = `🔥 ${streak}-day streak going strong! `;
      }
    }
  }

  // Day-specific messaging with 5 random options for each day
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

  const daySpecificMessages = [
    [ // Sunday
      'Sunday\'s special',
      'Relax with Sunday\'s',
      'Weekend wrap-up',
      'Sunday funday',
      'Perfect Sunday'
    ],
    [ // Monday
      'Start your Monday right with',
      'Monday motivation',
      'Fresh week, fresh',
      'Monday\'s featured',
      'Kick off Monday with'
    ],
    [ // Tuesday
      'Tuesday\'s featured',
      'Tackle Tuesday with',
      'Tuesday\'s pick',
      'Power through Tuesday with',
      'Tuesday treasure'
    ],
    [ // Wednesday
      'Midweek challenge',
      'Wednesday\'s wonder',
      'Hump day special',
      'Wednesday warrior',
      'Midweek motivation'
    ],
    [ // Thursday
      'Thursday\'s pick',
      'Almost Friday',
      'Thursday\'s featured',
      'Thursday thrills',
      'Push through Thursday with'
    ],
    [ // Friday
      'TGIF! Friday\'s',
      'Friday finale',
      'End the week with',
      'Friday\'s featured',
      'Weekend prep'
    ],
    [ // Saturday
      'Weekend warrior',
      'Saturday special',
      'Weekend vibes',
      'Saturday\'s pick',
      'Chill Saturday'
    ]
  ];

  const dayMessages = daySpecificMessages[dayOfWeek];
  const randomMessage = dayMessages[Math.floor(Math.random() * dayMessages.length)];

  return `${streakText}${randomMessage} ${gameDisplayName} level of the day! Difficulty: ${difficultyText}`;
}

export async function sendLevelOfDayPushNotifications(limit: number) {
  await dbConnect();

  try {
    // Get all levels of the day for all games
    const levelsOfDayPromises = Object.values(Games)
      .filter(game => !game.isNotAGame)
      .map(game => getLevelOfDay(game.id));

    const levelsOfDay = await Promise.all(levelsOfDayPromises);
    const validLevelsOfDay = levelsOfDay.filter(level => level !== null);

    if (validLevelsOfDay.length === 0) {
      logger.error('No levels of the day found for any game');

      return { sent: 0, failed: 0, error: 'No levels of the day available' };
    }

    // Find eligible users
    const eligibleUsers = await findEligibleUsers();

    if (eligibleUsers.length === 0) {
      logger.info('No eligible users found for level of day push notifications');

      return { sent: 0, failed: 0 };
    }

    // Limit the number of users if specified
    const usersToProcess = limit > 0 ? eligibleUsers.slice(0, limit) : eligibleUsers;

    const session = await UserModel.startSession();
    let sentCount = 0;
    let failedCount = 0;

    try {
      await session.withTransaction(async () => {
        const notificationIds: Types.ObjectId[] = [];

        for (const user of usersToProcess) {
          try {
            // Use the user's last played game, or default to the first available game
            const userGameId = user.lastGame || validLevelsOfDay[0].gameId;
            const userLevelOfDay = validLevelsOfDay.find(level => level.gameId === userGameId) || validLevelsOfDay[0];

            // Get game display name for message
            const game = Games[userLevelOfDay.gameId];
            const gameDisplayName = game?.displayName || userLevelOfDay.gameId;

            // Create an engaging message with level details
            const notificationMessage = createLevelOfDayMessage(userLevelOfDay, gameDisplayName, user.config);

            // Create notification
            const notification = await NotificationModel.create([{
              gameId: userLevelOfDay.gameId,
              message: notificationMessage,
              read: false,
              source: userLevelOfDay._id,
              sourceModel: 'Level',
              type: NotificationType.LEVEL_OF_DAY,
              userId: user._id,
            }], { session });

            if (notification && notification.length > 0) {
              notificationIds.push(notification[0]._id);

              // Determine optimal send time
              const sendTime = determineOptimalSendTime(user);

              // Queue the push notification with the scheduled time
              await bulkQueuePushNotification([notification[0]._id], session, sendTime, true); // true = no email, only push. email is done in the digest

              sentCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            logger.error('Error creating notification for user', { userId: user._id, error });
            failedCount++;
          }
        }
      });

      await session.endSession();
    } catch (error) {
      logger.error('Transaction error in sendLevelOfDayPushNotifications', error);
      await session.endSession();
      throw error;
    }

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    logger.error('Error in sendLevelOfDayPushNotifications', error);
    throw error;
  }
}

export default apiWrapper({
  GET: {
    query: {
      secret: ValidType('string', true),
      limit: ValidType('number', false, true)
    }
  }
}, async (req: NextApiRequest, res: NextApiResponse) => {
  const { secret, limit } = req.query;

  if (secret !== process.env.INTERNAL_JOB_TOKEN_SECRET_EMAILDIGEST) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limitNum = limit ? parseInt(limit as string) : 1000;

  try {
    const result = await sendLevelOfDayPushNotifications(limitNum);

    logger.info('Level of day push notifications sent', result);

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to send level of day push notifications', error);

    return res.status(500).json({
      error: 'Failed to send level of day push notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
