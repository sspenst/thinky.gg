import AchievementCategory from '@root/constants/achievements/achievementCategory';
import AdminCommand from '@root/constants/adminCommand';
import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import Role from '@root/constants/role';
import { ValidEnum, ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import genLevelImage from '@root/helpers/genLevelImage';
import { logger } from '@root/helpers/logger';
import { createNewAdminMessageNotifications } from '@root/helpers/notificationHelper';
import { refreshAchievements } from '@root/helpers/refreshAchievements';
import { archiveUserLevels, deleteUser } from '@root/helpers/userDeletion';
import { requestBroadcastReloadPage } from '@root/lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import Level from '@root/models/db/level';
import { AchievementModel, LevelModel, NotificationModel, StatModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { calcPlayAttempts, refreshIndexCalcs } from '@root/models/schemas/levelSchema';
import mongoose, { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { runEmailDigest } from '../internal-jobs/email-digest';
import { processQueueMessages } from '../internal-jobs/worker';
import { bulkQueueCalcPlayAttempts, bulkQueueRefreshAchievements } from '../internal-jobs/worker/queueFunctions';

export async function switchIsRanked(levelId: Types.ObjectId, gameId: GameId, isRanked?: boolean): Promise<boolean> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const level = await LevelModel.findById<Level>(levelId, { isRanked: 1 }, { session: session });

      if (!level) {
        throw new Error('Level not found');
      }

      const newIsRanked = isRanked !== undefined ? isRanked : !level.isRanked;

      await LevelModel.updateOne({ _id: levelId }, { isRanked: newIsRanked }, { session: session });

      const stats = await StatModel.find({ levelId: levelId, complete: true }, 'userId', { session: session });
      const userIds = stats.map(stat => stat.userId);

      await UserConfigModel.updateMany({ userId: { $in: userIds }, gameId: gameId }, { $inc: { calcRankedSolves: newIsRanked ? 1 : -1 } }, { session: session });
    });

    session.endSession();
  } catch (err) {
    logger.error(err);
    session.endSession();

    return false;
  }

  return true;
}

interface AdminBodyProps {
  targetId: string;
  command: AdminCommand;
  role: Role | null;
  payload: string;
}

export default withAuth({ POST: {
  body: {
    targetId: ValidObjectId(false),
    command: ValidEnum(Object.values(AdminCommand)),
    role: ValidEnum(Object.values(Role), false),
    payload: ValidType('string', false),
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  if (!req.user.roles.includes(Role.ADMIN)) {
    return res.status(401).json({
      error: 'Not authorized'
    });
  }

  const { targetId, command, role, payload } = req.body as AdminBodyProps;
  let resp = null;

  try {
    switch (command) {
    case AdminCommand.RefreshAchievements:
      resp = await refreshAchievements(req.gameId, new Types.ObjectId(targetId as string), Object.values(AchievementCategory));
      await processQueueMessages();
      break;
    case AdminCommand.DeleteAchievements:
      resp = await Promise.all([
        AchievementModel.deleteMany({ userId: new Types.ObjectId(targetId as string), gameId: req.gameId }),
        NotificationModel.deleteMany({ userId: new Types.ObjectId(targetId as string), type: NotificationType.NEW_ACHIEVEMENT, gameId: req.gameId }),
      ]);
      break;
    case AdminCommand.DeleteUser:
      await deleteUser(new Types.ObjectId(targetId as string));
      break;
    case AdminCommand.ArchiveAllLevels:
      await archiveUserLevels(new Types.ObjectId(targetId as string));
      break;
    case AdminCommand.RefreshIndexCalcs:
      await refreshIndexCalcs(new Types.ObjectId(targetId as string));
      break;

    case AdminCommand.RunBatchRefreshPlayAttempts: {
      // Query all levels into memory
      const allLevels = await LevelModel.find({
        isDraft: false,
        isDeleted: { $ne: true },
        gameId: req.gameId
      }, '_id');

      // for each level, add a message to the queue
      // we want to spread out the messages so we don't overload the queue with just these messages
      // so let's interleave them by having each message run at a different time... Divide 1 hour by the number of levels
      const oneHourSeconds = 60 * 60;

      await bulkQueueCalcPlayAttempts(allLevels.map(lvl => lvl._id), undefined, oneHourSeconds);

      break;
    }

    case AdminCommand.RunBatchRefreshAchievements: {
      // Query all users across all games who have any activity (solved levels, created levels, or records)
      // Use aggregation to get unique users who have any activity in any game
      const allUsers = await UserConfigModel.aggregate([
        {
          $match: {
            $or: [
              { calcLevelsSolvedCount: { $gt: 0 } },
              { calcLevelsCompletedCount: { $gt: 0 } },
            ]
          }
        },
        {
          $group: {
            _id: '$userId',
            userId: { $first: '$userId' }
          }
        }
      ]);

      console.log(`Found ${allUsers.length} users to refresh achievements for`);

      // for each user, add a message to the queue
      // we want to spread out the messages so we don't overload the queue with just these messages
      // so let's interleave them by having each message run at a different time... Divide 1 hour by the number of users
      const oneHourSeconds = 60 * 60;

      try {
        await bulkQueueRefreshAchievements(allUsers.map(user => user.userId), req.gameId, Object.values(AchievementCategory), undefined, oneHourSeconds);
        console.log(`Successfully queued ${allUsers.length} achievement refresh messages`);
        resp = { message: `Queued ${allUsers.length} achievement refresh messages (spread over 1 hour)` };
      } catch (error) {
        console.error('Error queuing achievement refresh messages:', error);
        throw error;
      }

      break;
    }

    case AdminCommand.RefreshPlayAttempts:
      await calcPlayAttempts(new Types.ObjectId(targetId as string));
      break;

    case AdminCommand.SendReloadPageToUsers: {
      await requestBroadcastReloadPage();
      break;
    }

    case AdminCommand.RegenImage: {
      const lvl = await LevelModel.findById<Level>(new Types.ObjectId(targetId as string));

      if (lvl) {
        await genLevelImage(lvl);
      } else {
        throw new Error('Level not found');
      }

      break;
    }

    case AdminCommand.SwitchIsRanked: {
      const success = await switchIsRanked(new Types.ObjectId(targetId as string), req.gameId);

      if (!success) {
        return res.status(500).json({ error: 'Error switching isRanked' });
      }

      break;
    }

    case AdminCommand.RunEmailDigest: {
      const { limit } = JSON.parse(req.body.payload);

      await runEmailDigest(limit);
      break;
    }

    case AdminCommand.SendAdminMessage: {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const userIdsAgg = await UserModel.aggregate([
            ...(role ? [{ $match: { roles: role } }] : []),
            { $project: { _id: 1 } },
            { $group: { _id: null, userIds: { $push: '$_id' } } },
          ], { session: session });

          const userIds = userIdsAgg[0].userIds as Types.ObjectId[];

          await createNewAdminMessageNotifications(req.gameId, userIds, payload, session);
        });

        session.endSession();
      } catch (err) {
        logger.error(err);
        session.endSession();

        return res.status(500).json({ error: 'Error sending admin message' });
      }

      break;
    }

    default:
      return res.status(400).json({
        error: command + ' is an invalid command'
      });
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    logger.error(e);

    return res.status(500).json({
      error: e.message
    });
  }

  return res.status(200).json({
    success: true,
    resp: resp
  });
});
