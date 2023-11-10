import Record from '@root/models/db/record';
import { Types } from 'mongoose';
import dbConnect from '../lib/dbConnect';
import Level from '../models/db/level';
import Review from '../models/db/review';
import { LevelModel, RecordModel, ReviewModel } from '../models/mongoose';
import { logger } from './logger';

export interface LevelWithRecordHistory extends Level {
    records: Record[];
}

export async function getRecordsByUserId(userId: Types.ObjectId): Promise<LevelWithRecordHistory[]> {
  const records = await RecordModel.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        userId: userId,
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
              isDraft: false,
            },
          },
          {
            $project: {
              name: 1,
              _id: 1,
              leastMoves: 1,
              ts: 1
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
          }
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

  ]);

  return records;
}

export async function getReviewsForUserIdCount(id: string | string[] | undefined) {
  await dbConnect();

  try {
    const levelsByUser = await LevelModel.find<Level>({ isDeleted: { $ne: true }, isDraft: false, userId: id }, '_id');
    const reviews = await ReviewModel.find<Review>({
      levelId: { $in: levelsByUser.map(level => level._id) },
    }).countDocuments();

    return reviews;
  } catch (err) {
    logger.error(err);

    return null;
  }
}
