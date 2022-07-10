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
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  didWin: {
    type: Boolean,
    required: true,
  },
  statId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stat',
    required: true,
  },
});

export default PlayAttemptSchema;
