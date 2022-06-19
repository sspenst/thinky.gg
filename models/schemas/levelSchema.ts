import { LevelModel, RecordModel, ReviewModel, StatModel, UserModel } from '../mongoose';

import Level from '../db/level';
import generateSlug from '../../helpers/generateSlug';
import mongoose from 'mongoose';

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
    // https://github.com/sspenst/pathology/wiki/Level-data-format
    data: {
      type: String,
      required: true,
      minLength: 2, // always need start and end
      maxlength: 40 * 40,
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
    points: {
      type: Number,
      required: true,
    },
    psychopathId: {
      type: Number,
    },
    slug: {
      type: String,
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
    calc_reviews_score_avg: {
      type: Number,
      required: false
    },
    calc_reviews_score_count: {
      type: Number,
      required: false
    },
    calc_reviews_score_laplace: {
      type: Number,
      required: false
    },
    calc_records_last_ts: {
      type: Number,
      required: false
    },
    calc_stats_players_beaten: {
      type: Number,
      required: false
    },
  },
  {
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  }
);

async function calcReviews(lvl:Level) {
  // get average score for reviews with levelId: id
  const reviews = await ReviewModel.find({
    levelId: lvl._id,
  });

  const reviewsCount = reviews.length;
  let totalUp = 0;
  let totalVotes = 0;

  for (let i = 0 ; i < reviewsCount ; i++) {
    const review = reviews[i];

    lvl.calc_reviews_score_avg += review.score;

    if (review.score !== 0) {
      const incr = 2.5 * ((review.score / 5) - 0.6);

      totalUp += incr; // maps to -1, -0.5, 0, 1, 2
      totalVotes++;
    }

  }

  // priors
  const A = 4.0;
  const B = 5.0;

  const reviewsScoreSum = reviews.reduce((acc, review) => acc + review.score, 0);
  const reviewsScoreAvg = reviewsCount > 0 ? reviewsScoreSum / reviewsCount : 0;
  const reviewsScoreLaplace = totalVotes > 0 ? (totalUp + A) / (totalVotes + B) : 0;

  return {
    calc_reviews_score_avg: reviewsScoreAvg,
    calc_reviews_score_count: reviewsCount,
    calc_reviews_score_laplace: reviewsScoreLaplace,

  };
}
async function calcRecords(lvl:Level) {
  // get last record with levelId: id
  const records = await RecordModel.find({
    levelId: lvl._id,
    moves: lvl.leastMoves
  }, {
    ts: 1,
  }).sort({
    ts: -1,
  }).limit(1);

  return {
    calc_records_last_ts: records[0]?.ts,
  };
}
async function calcStats(lvl:Level) {
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
export async function refreshIndexCalcs(lvl:Level) {
  // @TODO find a way to parallelize these in one big promise
  const reviews = await calcReviews(lvl);
  const records = await calcRecords(lvl);
  const stats = await calcStats(lvl);

  // save level
  const update = {
    ...reviews,
    ...records,
    ...stats
  };

  await LevelModel.findByIdAndUpdate(lvl._id, update);
}

LevelSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });

LevelSchema.pre('save', function (next) {

  if (this.isModified('name')) {
    UserModel.findById(this.userId).then(async (user) => {
      generateSlug(null, user.name, this.name).then((slug) => {
        this.slug = slug;

        return next();
      }).catch((err) => {
        return next(err);
      });
    }).catch((err) => {
      return next(err);
    });
  } else {
    return next();
  }
});

LevelSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  if (this.getUpdate().$set?.name) {
    LevelModel.findById(this._conditions._id)
      .populate('userId', 'name')
      .then(async (level) => {
        if (!level) {
          return next(new Error('Level not found'));
        }

        generateSlug(level._id.toString(), level.userId.name, this.getUpdate().$set.name).then((slug) => {
          this.getUpdate().$set.slug = slug;

          return next();
        }).catch((err) => {
          console.trace(err);

          return next(err);
        });
      })
      .catch((err) => {
        console.trace(err);

        return next(err);
      });
  } else {
    return next();
  }
});

/**
 * Note... There are other ways we can "update" a record in mongo like 'update' 'findOneAndUpdate' and 'updateMany'...
 * But slugs are usually needing to get updated only when the name changes which typically happens one at a time
 * So as long as we use updateOne we should be OK
 * Otherwise we will need to add more helpers or use a library
 * Problem with slug libraries for mongoose is that as of this writing (5/28/22) there seems to be issues importing them with typescript
 */

export default LevelSchema;
