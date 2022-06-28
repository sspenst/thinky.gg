import LevelImage from '../db/levelImage';
import mongoose from 'mongoose';

const LevelImageSchema = new mongoose.Schema<LevelImage>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    image: {
      type: Buffer,
      required: true,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      required: true,
      unique: true,
    },
    ts: {
      type: Number,
      required: true,
    },
  }
);

export default LevelImageSchema;
