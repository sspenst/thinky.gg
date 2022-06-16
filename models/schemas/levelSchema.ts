import { LevelModel, UserModel } from '../mongoose';
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
    },
    height: {
      type: Number,
      required: true,
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
