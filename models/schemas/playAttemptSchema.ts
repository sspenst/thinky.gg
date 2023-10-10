import mongoose from 'mongoose';
import PlayAttempt from '../db/playAttempt';

export enum AttemptContext {
  UNSOLVED = 0,
  JUST_SOLVED = 1,
  SOLVED = 2,
}

const PlayAttemptSchema = new mongoose.Schema<PlayAttempt>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  attemptContext: {
    type: Number,
    enum: AttemptContext,
    required: true,
    default: 0,
  },
  endTime: {
    type: Number,
    required: true,
  },
  isDeleted: {
    type: Boolean,
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  updateCount: {
    type: Number,
    required: true,
    default: 0,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

PlayAttemptSchema.index({ levelId: 1, userId: 1, endTime: -1, attemptContext: -1 });
PlayAttemptSchema.index({ userId: 1, endTime: -1 });

export default PlayAttemptSchema;
