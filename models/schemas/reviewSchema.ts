import { LevelModel } from '../mongoose';
import Review from '../db/review';
import mongoose from 'mongoose';
import { refreshIndexCalcs } from './levelSchema';

const ReviewSchema = new mongoose.Schema<Review>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  score: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    maxlength: 1024 * 5, // 5 kb limit seems reasonable
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
});

ReviewSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  return next();
});
ReviewSchema.post('save', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }
});
ReviewSchema.post('deleteOne', async function(val, next) {

  if (val.deletedCount > 0) {
    const deletedLevelId = this.getQuery()?.levelId.toString();

    const level = await LevelModel.findById(deletedLevelId);

    if (level) {
      await refreshIndexCalcs(level);
    }
  }

  next();
});
ReviewSchema.post('updateOne', async function(val) {
  if (val.modifiedCount > 0) {
    const updatedDoc = await this.model.findOne(this.getQuery());

    const level = await LevelModel.findById(updatedDoc.levelId);

    if (level) {
      await refreshIndexCalcs(level);
    }
  }
});
export default ReviewSchema;
