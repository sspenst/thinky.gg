import Creator from '../db/creator';
import mongoose from 'mongoose';

const CreatorSchema = new mongoose.Schema<Creator>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  hasLevel: {
    type: Boolean,
  },
  name: {
    type: String,
    required: true,
  },
  official: {
    type: Boolean,
  },
  psychopathId: {
    type: Number,
  },
});

export default CreatorSchema;
