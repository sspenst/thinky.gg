import Level from '../db/level';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
  },
  // data format is a string of 'LevelDataType's with rows separated by '\n'
  data: {
    type: String,
    required: true,
    unique: true,
  },
  height: {
    type: Number,
    required: true,
  },
  leastMoves: {
    type: Number,
    required: true,
  },
  leastMovesTs: {
    type: Number,
    required: true,
  },
  leastMovesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  officialUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  worldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'World',
    required: true,
  },
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

export default LevelSchema;
