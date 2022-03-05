import mongoose from 'mongoose';

const CreatorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  psychopathId: {
    type: Number,
  },
});

export default mongoose.models.Creator || mongoose.model('Creator', CreatorSchema);
