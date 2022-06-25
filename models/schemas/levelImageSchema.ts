import LevelImage from '../db/level_image';
import mongoose from 'mongoose';

const LevelImageSchema = new mongoose.Schema<LevelImage>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    ts: {
      type: Number,
      required: true,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      required: true,
    },
    image: {
      type: Buffer,
      required: true,
    },
  });

export default LevelImageSchema;
