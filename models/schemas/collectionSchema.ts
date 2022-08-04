import Collection from '../db/collection';
import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema<Collection>({
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
  },
}, {
  timestamps: true,
  collation: {
    locale: 'en_US',
    strength: 2,
  },
});

CollectionSchema.index({ userId: 1 });

CollectionSchema.pre('updateOne', function (next) {
  this.options.runValidators = true;

  return next();
});

export default CollectionSchema;
