import Pack from '../db/pack';
import mongoose from 'mongoose';

const PackSchema = new mongoose.Schema<Pack>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
});

export default PackSchema;
