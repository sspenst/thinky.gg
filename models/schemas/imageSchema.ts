import Image from '../db/image';
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema<Image>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    image: {
      type: Buffer,
      required: true,
    },
    ts: {
      type: Number,
      required: true,
    },
  }
);

export default ImageSchema;
