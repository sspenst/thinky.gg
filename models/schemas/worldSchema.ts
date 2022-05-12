import World from '../db/world';
import mongoose from 'mongoose';
import LevelSchema from './levelSchema'

const WorldSchema = new mongoose.Schema<World>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
  },
  levels: {
    type: [LevelSchema]
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
}, {
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

export default WorldSchema;
