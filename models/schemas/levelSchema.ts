import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import getDifficultyEstimate from '../../helpers/getDifficultyEstimate';
import Level from '../db/level';
import { LevelModel, PlayAttemptModel, ReviewModel, StatModel } from '../mongoose';
import { AttemptContext } from './playAttemptSchema';

const LevelSchema = new mongoose.Schema<Level>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    authorNote: {
      type: String,
      maxlength: 1024 * 5, // 5 kb limit seems reasonable
    },
    calc_difficulty_estimate: {
      type: Number,
      default: 0,
    },
    calc_playattempts_count: {
      type: Number,
      default: 0,
    },
    calc_playattempts_duration_sum: {
      type: Number,
      default: 0,
    },
    calc_playattempts_just_beaten_count: {
      type: Number,
      default: 0,
    },
    calc_playattempts_unique_users: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    calc_reviews_count: {
      type: Number,
      required: false,
      default: 0
    },
    calc_reviews_score_avg: {
      type: Number,
      required: false,
      default: 0.00
    },
    calc_reviews_score_laplace: {
      type: Number,
      required: false,
      default: 0.00
    },
    calc_stats_players_beaten: {
      type: Number,
      required: false,
      default: 0
    },
    // https://github.com/sspenst/pathology/wiki/Level-data-format
    data: {
      type: String,
      required: true,
      minLength: 2, // always need start and end
      maxlength: 40 * 40 + 39,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
    isDraft: {
      type: Boolean,
      required: true,
    },
    leastMoves: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
    },
    ts: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
      max: 40,
    },
  },
  {
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  }
);

LevelSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });
LevelSchema.index({ userId: 1 });
LevelSchema.index({ name: 1 });
LevelSchema.index({ ts: -1 });
LevelSchema.index({ isDraft: 1 });
LevelSchema.index({ leastMoves: 1 });
LevelSchema.index({ calc_difficulty_estimate: 1 });
LevelSchema.index({ calc_playattempts_count: 1 });
LevelSchema.index({ calc_playattempts_duration_sum: 1 });
LevelSchema.index({ calc_playattempts_just_beaten_count: 1 });
LevelSchema.index({ calc_playattempts_unique_users: 1 });
LevelSchema.index({ calc_reviews_count: 1 });
LevelSchema.index({ calc_reviews_score_avg: 1 });
LevelSchema.index({ calc_reviews_score_laplace: 1 });
LevelSchema.index({ calc_stats_players_beaten: 1 });

async function calcReviews(lvl: Level) {
  // get average score for reviews with levelId: id
  const reviews = await ReviewModel.find({
    levelId: lvl._id,
  });

  let totalUp = 0;
  let totalVotes = 0;

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    if (review.score !== 0) {
      // maps to 0, 0.25, 0.5, 0.75, 1
      const incr = (review.score - 1) / 4;

      totalUp += incr;
      totalVotes++;
    }
  }

  // priors
  const A = 2.0;
  const B = 3.0;

  const reviewsScoreSum = reviews.reduce((acc, review) => acc + review.score, 0);
  const reviewsScoreAvg = totalVotes > 0 ? reviewsScoreSum / totalVotes : 0;
  const reviewsScoreLaplace = (totalUp + A) / (totalVotes + B);

  return {
    calc_reviews_count: reviews.length,
    calc_reviews_score_avg: reviewsScoreAvg,
    calc_reviews_score_laplace: reviewsScoreLaplace,
  };
}

async function calcStats(lvl: Level) {
  // get last record with levelId: id
  // group by userId
  const aggs = [
    {
      $match: {
        levelId: lvl._id,
        moves: lvl.leastMoves
      }
    },
    {
      $group: {
        _id: '$userId',
        count: {
          $sum: 1,
        },
      }
    }
  ];

  const q = await StatModel.aggregate(aggs);

  const players_beaten = q.length;

  return {
    calc_stats_players_beaten: players_beaten
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calcPlayAttempts(levelId: ObjectId, options: any = {}) {
  // get counts of distinct attemptcontexts
  const countSplit = await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: levelId,
      },
    },
    {
      $group: {
        _id: '$attemptContext',
        count: {
          $sum: 1,
        },
      },
    },
  ], options);
  let countNotBeaten = 0;
  let countOnlyBeaten = 0;

  for (let i = 0; i < countSplit.length; i++) {
    const split = countSplit[i];

    if (split._id !== AttemptContext.BEATEN) {
      countNotBeaten += split.count;
    }

    if (split._id === AttemptContext.JUST_BEATEN) {
      countOnlyBeaten = split.count;
    }
  }

  // sumDuration is all of the sum(endTime-startTime) within the playAttempts
  const sumDuration = await PlayAttemptModel.aggregate([
    {
      $match: {
        levelId: levelId,
        attemptContext: { $ne: AttemptContext.BEATEN },
      }
    },
    {
      $group: {
        _id: null,
        sumDuration: {
          $sum: {
            $subtract: ['$endTime', '$startTime']
          }
        }
      }
    }
  ], options);

  // get array of unique userIds from playattempt calc_playattempts_unique_users
  const uniqueUsersList = await PlayAttemptModel.distinct('userId', {
    levelId: levelId,
    attemptContext: { $ne: AttemptContext.BEATEN },
  });
  // TODO: need to filter out play attempts where
  // attemptContext === AttemptContext.UNBEATEN && startTime === endTime

  const update = {
    calc_playattempts_count: countNotBeaten,
    calc_playattempts_duration_sum: sumDuration[0]?.sumDuration ?? 0,
    calc_playattempts_just_beaten_count: countOnlyBeaten,
    calc_playattempts_unique_users: uniqueUsersList.map(userId => userId.toString()),
  } as Partial<Level>;

  update.calc_difficulty_estimate = getDifficultyEstimate(update, uniqueUsersList.length);

  return await LevelModel.findByIdAndUpdate<Level>(levelId, {
    $set: update,
  }, { new: true, ...options });
}

export async function refreshIndexCalcs(lvlParam: ObjectId) {
  const lvl = await LevelModel.findById(lvlParam as ObjectId);

  const [reviews, stats] = await Promise.all([calcReviews(lvl), calcStats(lvl)]);

  // save level
  const update = {
    ...reviews,
    ...stats
  };

  await LevelModel.findByIdAndUpdate(lvl._id, update);
}

/**
 * Note... There are other ways we can "update" a record in mongo like 'update' 'findOneAndUpdate' and 'updateMany'...
 * But slugs are usually needing to get updated only when the name changes which typically happens one at a time
 * So as long as we use updateOne we should be OK
 * Otherwise we will need to add more helpers or use a library
 * Problem with slug libraries for mongoose is that as of this writing (5/28/22) there seems to be issues importing them with typescript
 */

export default LevelSchema;
