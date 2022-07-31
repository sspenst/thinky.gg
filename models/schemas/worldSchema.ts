import World from '../db/world';
import mongoose from 'mongoose';

const WorldSchema = new mongoose.Schema<World>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  authorNote: {
    type: String,
    maxlength: 1024 * 5, // 5 kb limit seems reasonable
  },
  levels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
  }],
  name: {
    type: String,
    minlength: 1,
    maxlength: 50,
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
  timestamps: true,
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

WorldSchema.index({ userId: 1 });

WorldSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  return next();
});

export default WorldSchema;
