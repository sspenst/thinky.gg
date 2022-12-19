import mongoose from 'mongoose';
import Comment from '../db/comment';

const CommentSchema = new mongoose.Schema<Comment>({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: true,
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Comment'],
  },
  text: {
    type: String,
    required: true,
    maxlength: 500,
    minlength: 1,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// indexes
CommentSchema.index({ author: 1 });
CommentSchema.index({ parent: 1 });

export default CommentSchema;
