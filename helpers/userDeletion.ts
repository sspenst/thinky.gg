import { GameId } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { generateCollectionSlug, generateLevelSlug } from '@root/helpers/generateSlug';
import { TimerUtil } from '@root/helpers/getTs';
import { logger } from '@root/helpers/logger';
import Collection from '@root/models/db/collection';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';
import { AchievementModel, CollectionModel, CommentModel, DeviceModel, GraphModel, KeyValueModel, LevelModel, NotificationModel, UserAuthModel, UserConfigModel, UserModel } from '@root/models/mongoose';
import mongoose, { ClientSession, Types } from 'mongoose';

export async function deleteUser(userId: Types.ObjectId, gameId: GameId, session?: ClientSession): Promise<void> {
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
      // Get levels to archive
      const levels = await LevelModel.find<Level>({
        userId: userId,
        isDeleted: { $ne: true },
        isDraft: false,
        gameId: gameId,
      }, '_id name', { session: session }).lean<Level[]>();

      // Archive levels by transferring to archive user
      for (const level of levels) {
        const slug = await generateLevelSlug(level.gameId, 'archive', level.name, level._id.toString(), { session: session });

        await LevelModel.updateOne({ _id: level._id }, { $set: {
          userId: new Types.ObjectId(TestId.ARCHIVE),
          archivedBy: userId,
          archivedTs: ts,
          slug: slug,
        } }, { session: session });
      }

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
