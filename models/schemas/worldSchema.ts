import World from '../db/world';
import mongoose from 'mongoose';

const WorldSchema = new mongoose.Schema<World>({
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

export default WorldSchema;
