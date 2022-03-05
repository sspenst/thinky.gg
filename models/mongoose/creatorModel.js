import mongoose from 'mongoose';

const CreatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  psychopathId: {
    type: Number,
  },
});

const CreatorModel = mongoose.models.Creator || mongoose.model('Creator', CreatorSchema);

export default CreatorModel;
