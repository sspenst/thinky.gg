import Level from '../db/level';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
  },
  data: {
    type: String,
    required: true,
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
  },
  leastMovesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: {
    type: String,
    required: true
  },
  originalCreatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pack',
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  width: {
    type: Number,
    required: true,
  },
});

export default LevelSchema;
