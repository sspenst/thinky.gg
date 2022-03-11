import Level from '../data/pathology/level';
import mongoose from 'mongoose';

const LevelSchema = new mongoose.Schema<Level>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
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
  name: {
    type: String,
    required: true
  },
  packId: {
    type: mongoose.Schema.Types.ObjectId,
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

const LevelModel = mongoose.models.Level || mongoose.model<Level>('Level', LevelSchema);

export default LevelModel;
