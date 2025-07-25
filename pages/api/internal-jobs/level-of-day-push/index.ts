import { Games } from '@root/constants/Games';
import NotificationType from '@root/constants/notificationType';
import Device from '@root/models/db/device';
import User from '@root/models/db/user';
import { DeviceModel, NotificationModel, PlayAttemptModel, UserModel } from '@root/models/mongoose';
import { DeviceState } from '@root/models/schemas/deviceSchema';
import { Types } from 'mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import dbConnect from '../../../../lib/dbConnect';
import { getLevelOfDay } from '../../level-of-day';
import { bulkQueuePushNotification } from '../worker/queueFunctions';

interface UserWithDeviceAndActivity extends User {
  devices: Device[];
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
        isGuest: { $ne: true },
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
                  { $gte: ['$endTime', oneMonthAgo.getTime() / 1000] },
                  { $eq: [{ $dayOfWeek: { $toDate: { $multiply: ['$endTime', 1000] } } }, dayOfWeek + 1] } // MongoDB dayOfWeek is 1-7, JS is 0-6
                ]
              }
            }
          },
          {
            $project: {
              hourOfDay: { $hour: { $toDate: { $multiply: ['$endTime', 1000] } } }
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

  // If they have activity data, use the most active hour
  if (user.lastMonthActivity && user.lastMonthActivity.length > 0) {
    const mostActiveHour = user.lastMonthActivity[0].hourOfDay;
    const sendTime = new Date();

    sendTime.setUTCHours(mostActiveHour, 0, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (sendTime <= now) {
      sendTime.setDate(sendTime.getDate() + 1);
    }

    return sendTime;
  }

  // No activity data - schedule randomly over the next 3 hours
  const randomMinutes = Math.floor(Math.random() * 180); // 0-180 minutes
  const sendTime = new Date(now.getTime() + randomMinutes * 60 * 1000);

  return sendTime;
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
            // Pick a random game's level of the day
            const randomLevel = validLevelsOfDay[Math.floor(Math.random() * validLevelsOfDay.length)];

            // Create notification
            const notification = await NotificationModel.create([{
              gameId: randomLevel.gameId,
              message: `Check out today's ${randomLevel.gameId} level of the day!`,
              read: false,
              source: randomLevel._id,
              sourceModel: 'Level',
              type: NotificationType.LEVEL_OF_DAY,
              userId: user._id,
            }], { session });

            if (notification && notification.length > 0) {
              notificationIds.push(notification[0]._id);

              // Determine optimal send time
              const sendTime = determineOptimalSendTime(user);

              // Queue the push notification with the scheduled time
              await bulkQueuePushNotification([notification[0]._id], session, sendTime);

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

