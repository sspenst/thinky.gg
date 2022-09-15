import mongoose from 'mongoose';
import Collection from '../db/collection';

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
  slug: {
    type: String,
    required: false, /** TODO - Once deployed, let's back fill and then set this to true */
  },
  tags: {
    type: [String],
    default: [],
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
CollectionSchema.index({ slug: 1 }, { name: 'slug_index', unique: true });

export default CollectionSchema;
