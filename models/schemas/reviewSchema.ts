import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import Review from '../db/review';

const ReviewSchema = new mongoose.Schema<Review>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  isDeleted: {
    type: Boolean,
  },
  gameId: {
    type: String,
    enum: GameId,
    required: true,
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
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

ReviewSchema.index({ levelId: 1, userId: 1, gameId: 1 }, { unique: true });
ReviewSchema.index({ ts: -1 });
ReviewSchema.index({ userId: 1 });

export default ReviewSchema;
