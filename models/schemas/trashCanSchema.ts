import mongoose from 'mongoose';
import TrashCan from '../db/trashCan';

const TrashCanSchema = new mongoose.Schema<TrashCan>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Original record data
  originalDocument: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Metadata for recovery
  originalCollection: {
    type: String,
    required: true,
  },
  originalField: {
    type: String,
    required: true,
  },
  orphanedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Deletion metadata
  deletedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  deletedBy: {
    type: String,
    enum: ['orphan-check', 'admin', 'user', 'system'],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },

  // Optional metadata
  notes: {
    type: String,
  },
  canRestore: {
    type: Boolean,
    required: true,
    default: true,
  },

  // Tracking
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Indexes for efficient querying
TrashCanSchema.index({ originalCollection: 1, deletedAt: -1 });
TrashCanSchema.index({ orphanedUserId: 1 });
TrashCanSchema.index({ originalId: 1, originalCollection: 1 }, { unique: true });
TrashCanSchema.index({ deletedAt: -1 });
TrashCanSchema.index({ canRestore: 1 });

// Update the updatedAt field before saving
TrashCanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default TrashCanSchema;
