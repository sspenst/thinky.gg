import PlayAttempt from '../db/playAttempt';
import mongoose from 'mongoose';

// create enum for attemptContext with types UNBEATEN, JUST_BEATEN, and BEATEN
export enum AttemptContext {
  UNBEATEN = 0,
  JUST_BEATEN = 1,
  BEATEN = 2,
}

const PlayAttemptSchema = new mongoose.Schema<PlayAttempt>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  attemptContext: {
    type: Number,
    required: true,
    default: 0,
  },
  endTime: {
    type: Number,
    required: true,
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

// add index for levelId
PlayAttemptSchema.index({ levelId: 1 });
// combo index for levelId and userId
PlayAttemptSchema.index({ levelId: 1, userId: 1 });
// combo index for levelId and attemptContext
PlayAttemptSchema.index({ levelId: 1, attemptContext: 1 });
export default PlayAttemptSchema;
