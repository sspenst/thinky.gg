import Level from '../db/level';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
    maxlength: 1024 * 5, // 5 kb limit seems reasonable
  },
  // data format is a string of 'LevelDataType's with rows separated by '\n'
  data: {
    type: String,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  isDraft: {
    type: Boolean,
    required: true,
  },
  leastMoves: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 50,
  },
  points: {
    type: Number,
    required: true,
  },
  psychopathId: {
    type: Number,
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
  width: {
    type: Number,
    required: true,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

export default LevelSchema;
