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

export default ReviewSchema;
ReviewSchema.post('save', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }
});
ReviewSchema.post('updateOne', async function() {
  const level = await LevelModel.findById(this.levelId);

  if (level) {
    await refreshIndexCalcs(level);
  }
});
