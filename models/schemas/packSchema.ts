import Pack from '../db/pack';
import mongoose from 'mongoose';

const PackSchema = new mongoose.Schema<Pack>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export default PackSchema;
