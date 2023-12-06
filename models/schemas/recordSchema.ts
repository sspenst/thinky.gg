import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import Record from '../db/record';

const RecordSchema = new mongoose.Schema<Record>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
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

RecordSchema.index({ levelId: 1 });
RecordSchema.index({ levelId: 1, moves: 1 }, { unique: true });

export default RecordSchema;
