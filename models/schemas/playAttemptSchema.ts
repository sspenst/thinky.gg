/**
 * playattempt is a schema for a play attempt...
 * gameId is the game id of the game that the play attempt is for
 * levelId is the level id of the level that the play attempt is for
 * userId is the user id of the user that the play attempt is for
 * startTime is the start time of the play attempt
 * endTime is the end time of the play attempt
 * attemptContext is the context of the play attempt
 * isDeleted is a boolean that indicates if the play attempt is deleted
 * updateCount is the number of times the play attempt has been updated
 * userId is the user id of the user that the play attempt is for
 */
import { GameId } from '@root/constants/GameId';
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
  gameId: {
    type: String,
    enum: GameId,
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
