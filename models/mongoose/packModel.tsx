import Pack from '../data/pathology/pack';
import mongoose from 'mongoose';

const PackSchema = new mongoose.Schema<Pack>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  creatorId: {
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

const PackModel = mongoose.models.Pack || mongoose.model<Pack>('Pack', PackSchema);

export default PackModel;
