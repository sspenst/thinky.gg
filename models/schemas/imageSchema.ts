import Image from '../db/image';
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema<Image>(
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

export default ImageSchema;
