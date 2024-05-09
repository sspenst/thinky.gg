import { GameId } from '@root/constants/GameId';
import Record from '@root/models/db/record';
import User from '@root/models/db/user';
import { PipelineStage, Types } from 'mongoose';
import Level from '../models/db/level';
import Review from '../models/db/review';
import { LevelModel, RecordModel, ReviewModel } from '../models/mongoose';
import { getEnrichLevelsPipelineSteps } from './enrich';
import { logger } from './logger';

export interface LevelWithRecordHistory extends Level {
  records: Record[];
}

export async function getRecordsByUserId(gameId: GameId, userId: Types.ObjectId, reqUser?: User): Promise<LevelWithRecordHistory[]> {
  const lookupPipelineUser = reqUser ? getEnrichLevelsPipelineSteps(reqUser) : [];

  const records = await RecordModel.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        userId: userId,
        gameId: gameId,
      },
    },
    // in case they have multiple records on the same level, we want to grab the  one with minimal moves
    {
      $sort: { ts: -1 },
    },
    // now we want to group by levelId and grab the first record
    {
      $group: {
        _id: '$levelId',
        recordId: { $first: '$$ROOT' },
      },
    },
    {
      // replace the _id with the recordId
      $replaceRoot: {
        newRoot: '$recordId',
      },
    },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'levelId',
        pipeline: [
          {
            $match: {
              userId: { $ne: userId },
              isDeleted: { $ne: true },
              archivedBy: { $ne: userId },
              isDraft: false,
            },
          },
          ...lookupPipelineUser as PipelineStage[],
          {
            $project: {
              name: 1,
              _id: 1,
              leastMoves: 1,
              slug: 1,
              ts: 1,
              userAttempts: 1,
              userMoves: 1,
              userTs: 1
            }
          },
          {
            // also grab the whole history of records...
            $lookup: {
              from: RecordModel.collection.name,
              localField: '_id',
              foreignField: 'levelId',
              as: 'records',
              pipeline: [
                {
                  $match: {
                    isDeleted: { $ne: true },
                  },
                },
                {
                  $sort: {
                    moves: 1,
                  },
                },
              ],
            },
          },
        ],
      }
    },
    {
      $unwind: {
        path: '$levelId',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      /** now we need to filter out levels where records.length===1 because that means it is the original record on the level */
      /** also we should filter out where we are not holding the first position */
      $match: { // opposite of $match would be
        'levelId.records.0.userId': userId,
      },
    },
    // return just the levelId
    {
      $replaceRoot: {
        newRoot: '$levelId',
      },
    },
  ] as PipelineStage[]);

  return records;
}

export async function getReviewsForUserIdCount(gameId: GameId, id: string | string[] | undefined) {
  try {
    const levelsByUser = await LevelModel.find<Level>({ isDeleted: { $ne: true }, isDraft: false, userId: id, gameId: gameId }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) },
    }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
