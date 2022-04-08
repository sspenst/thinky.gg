import Review from '../db/review';
import mongoose from 'mongoose';

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
});

export default ReviewSchema;
