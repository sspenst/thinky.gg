import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import TestId from '@root/constants/testId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { generateLevelSlug } from '@root/helpers/generateSlug';
import { TimerUtil } from '@root/helpers/getTs';
import { logger } from '@root/helpers/logger';
import Level from '@root/models/db/level';
import { AchievementModel, CollectionModel, CommentModel, DeviceModel, GraphModel, KeyValueModel, LevelModel, NotificationModel, PlayAttemptModel, ReportModel, ReviewModel, UserAuthModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import { queueCalcCreatorCounts } from '@root/pages/api/internal-jobs/worker';
import mongoose, { ClientSession, Types } from 'mongoose';

export async function archiveUserLevels(userId: Types.ObjectId, session?: ClientSession): Promise<void> {
  const ts = TimerUtil.getTs();
  const sessionProvided = !!session;

  if (!sessionProvided) {
    session = await mongoose.startSession();
  }

  // TypeScript assertion - session is guaranteed to exist here
  if (!session) {
    throw new Error('Failed to create session');
  }

  try {
    const executeInTransaction = async () => {
      // Get all levels to archive across all games
      const allLevels = await LevelModel.find<Level>({
        userId: userId,
        isDeleted: { $ne: true },
        isDraft: false,
      }, '_id name gameId', { session: session }).lean<Level[]>();

      if (allLevels.length === 0) {
        return; // No levels to archive
      }

      // Archive levels by transferring to archive user using Promise.all
      await Promise.all(allLevels.map(async (level) => {
        const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString(), { session: session });

        await LevelModel.updateOne({ _id: level._id }, { $set: {
          userId: new Types.ObjectId(TestId.ARCHIVE),
          archivedBy: userId,
          archivedTs: ts,
          slug: slug,
        } }, { session: session });
      }));

      // Get user info for Discord notification
      const user = await UserModel.findById(userId, 'name', { session: session });

      // Group levels by game for Discord notifications
      const levelsByGame = allLevels.reduce((acc, level) => {
        if (!acc[level.gameId]) {
          acc[level.gameId] = [];
        }

        acc[level.gameId].push(level);

        return acc;
      }, {} as Record<string, Level[]>);

      // Queue creator count updates and Discord notifications
      const queuePromises: Promise<void>[] = [];

      for (const [gameIdString, levels] of Object.entries(levelsByGame)) {
        const gameId = gameIdString as GameId;
        const discordChannel = gameId === GameId.SOKOPATH ? DiscordChannel.SokopathLevels : DiscordChannel.PathologyLevels;

        queuePromises.push(
          queueCalcCreatorCounts(gameId, new Types.ObjectId(TestId.ARCHIVE), { session: session }),
          queueCalcCreatorCounts(gameId, userId, { session: session }),
          queueDiscordWebhook(discordChannel, `**${user?.name || 'Unknown User'}** had ${levels.length} level${levels.length === 1 ? '' : 's'} archived by admin`, { session: session })
        );
      }

      await Promise.all(queuePromises);
    };

    if (sessionProvided) {
      await executeInTransaction();
    } else {
      await session.withTransaction(executeInTransaction);
      session.endSession();
    }
  } catch (err) {
    logger.error('Error archiving user levels:', err);

    if (!sessionProvided && session) {
      session.endSession();
    }

    throw err;
  }
}

export async function deleteUser(userId: Types.ObjectId, session?: ClientSession): Promise<void> {
  const deletedAt = new Date();
  const ts = TimerUtil.getTs();
  const sessionProvided = !!session;

  if (!sessionProvided) {
    session = await mongoose.startSession();
  }

  // TypeScript assertion - session is guaranteed to exist here
  if (!session) {
    throw new Error('Failed to create session');
  }

  try {
    const executeInTransaction = async () => {
      // Archive levels using the extracted function
      await archiveUserLevels(userId, session);

      // Get comments to delete (on user's profile and by user)
      const commentAgg = await CommentModel.aggregate([
        {
          $match: {
            deletedAt: null,
            targetModel: 'User',
            $or: [
              { author: userId },
              { target: userId },
            ],
          },
        },
        {
          $lookup: {
            from: CommentModel.collection.name,
            localField: '_id',
            foreignField: 'target',
            as: 'children',
            pipeline: [
              {
                $project: {
                  _id: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            children: 1,
          },
        },
      ], { session: session });

      const commentIdsToDelete = [];

      for (const comment of commentAgg) {
        commentIdsToDelete.push(comment._id);

        for (const child of comment.children) {
          commentIdsToDelete.push(child._id);
        }
      }

      // Delete all user-related data
      await Promise.all([
        AchievementModel.deleteMany({ userId: userId }, { session: session }),
        CollectionModel.deleteMany({ userId: userId }, { session: session }),
        CommentModel.updateMany({ _id: { $in: commentIdsToDelete } }, { $set: { deletedAt: deletedAt } }, { session: session }),
        DeviceModel.deleteMany({ userId: userId }, { session: session }),
        GraphModel.deleteMany({ $or: [{ source: userId }, { target: userId }] }, { session: session }),
        KeyValueModel.deleteMany({ key: { $regex: `.*${userId}.*` } }, { session: session }),
        // Delete draft levels
        LevelModel.updateMany({ userId: userId, isDraft: true }, { $set: { isDeleted: true } }, { session: session }),
        NotificationModel.deleteMany({ $or: [
          { source: userId },
          { target: userId },
          { userId: userId },
        ] }, { session: session }),
        UserConfigModel.deleteMany({ userId: userId }, { session: session }),
        UserAuthModel.deleteMany({ userId: userId }, { session: session }),
        UserModel.deleteOne({ _id: userId }, { session: session }),

        ReportModel.deleteMany({ reportedUser: userId }, { session: session }),
        PlayAttemptModel.updateMany({ userId: userId }, { $set: { isDeleted: true } }, { session: session }),
        ReviewModel.updateMany({ userId: userId }, { $set: { isDeleted: true } }, { session: session }),

      ]);
    };

    if (sessionProvided) {
      await executeInTransaction();
    } else {
      await session.withTransaction(executeInTransaction);
      session.endSession();
    }
  } catch (err) {
    logger.error('Error deleting user:', err);

    if (!sessionProvided && session) {
      session.endSession();
    }

    throw err;
  }
}
