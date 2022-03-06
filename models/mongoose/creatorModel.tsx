import Creator from '../data/pathology/creator';
import mongoose from 'mongoose';

const CreatorSchema = new mongoose.Schema<Creator>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
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

const CreatorModel = mongoose.models.Creator || mongoose.model<Creator>('Creator', CreatorSchema);

export default CreatorModel;
