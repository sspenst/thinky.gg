import mongoose from 'mongoose';
import Image from '../db/image';

const ImageSchema = new mongoose.Schema<Image>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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

ImageSchema.index({ documentId: 1 }, { unique: true });

export default ImageSchema;
