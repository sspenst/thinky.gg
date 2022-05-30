import { LevelModel, UserModel } from '../mongoose';

import Level from '../db/level';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
  },
  // data format is a string of 'LevelDataType's with rows separated by '\n'
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
    slug: 'name'
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
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

LevelSchema.index({ slug: 1 }, { name: 'slug_index'});

LevelSchema.pre('save', function(next) {
  // update slug if name changed
  if (this.isModified('name')) {
    UserModel.findById(this.userId).then(user => {
      this.slug = user.name + '/' + this.name.replace(/\s+/g, '-').toLowerCase();
      next();
    });
  } else {
    next();
  }
});

// Now do updateOne
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onUpdateCheck = async function(me:any, next:any) {
  if (me.getUpdate().$set.name) {
    LevelModel.findById(me._conditions._id).then(level => {
      UserModel.findById(level.userId).then(user => {
        me.getUpdate().$set.slug = user.name + '/' + me.getUpdate().$set.name.replace(/\s+/g, '-').toLowerCase();
        next();
      });
    });
  } else {
    next();
  }
};

LevelSchema.pre('updateOne', function(next) {
  onUpdateCheck(this, next);
});
/**
 * Note... There are other ways we can "update" a record in mongo like 'update' 'findOneAndUpdate' and 'updateMany'...
 * But slugs are usually needing to get updated only when the name changes which typically happens one at a time
 * So as long as we use updateOne we should be OK
 * Otherwise we will need to add more helpers or use a library
 * Problem with slug libraries for mongoose is that as of this writing (5/28/22) there seems to be issues importing them with typescript
*/

export default LevelSchema;
