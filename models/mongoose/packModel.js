import mongoose from 'mongoose';

const PackSchema = new mongoose.Schema({
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

const PackModel = mongoose.models.Pack || mongoose.model('Pack', PackSchema);

export default PackModel;
