import Stat from '../db/stat';
import mongoose from 'mongoose';

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
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: true,
  },
  moves: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export default StatSchema;
