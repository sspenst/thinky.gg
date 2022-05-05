import Record from '../db/record';
import mongoose from 'mongoose';

const RecordSchema = new mongoose.Schema<Record>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
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

export default RecordSchema;
