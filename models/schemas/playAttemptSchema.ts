import { LevelModel } from '../mongoose';
import PlayAttempt from '../db/PlayAttempt';
import Stat from '../db/stat';
import mongoose from 'mongoose';
import { refreshIndexCalcs } from './levelSchema';

const PlayAttemptSchema = new mongoose.Schema<PlayAttempt>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
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
  statId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stat',
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

export default PlayAttemptSchema;
