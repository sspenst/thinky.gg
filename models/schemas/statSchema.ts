import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import Stat from '../db/stat';

const StatSchema = new mongoose.Schema<Stat>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  attempts: {
    type: Number,
    required: true,
  },
  complete: {
    type: Boolean,
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
  moves: {
    type: Number,
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

StatSchema.index({ complete: 1 });
StatSchema.index({ levelId: 1 });
StatSchema.index({ userId: 1, complete: 1 });
StatSchema.index({ userId: 1, levelId: 1 }, { unique: true });

export default StatSchema;
