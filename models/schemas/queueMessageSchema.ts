import mongoose from 'mongoose';
import { QueueMessage, QueueMessageState, QueueMessageType } from '../db/queueMessage';

export const QueueMessageSchema = new mongoose.Schema<QueueMessage>({
  priority: {
    type: Number,
    required: false,
    default: 0,
  },
  dedupeKey: {
    type: String,
    required: false,
  },
  jobRunId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  message: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
    enum: QueueMessageState
  },
  type: {
    type: String,
    required: true,
    enum: QueueMessageType
  },
  processingStartedAt: {
    type: Date,
    required: false,
  },
  processingCompletedAt: {
    type: Date,
    required: false,
  },
  processingAttempts: {
    type: Number,
    required: true,
    default: 0,
  },
  log: {
    // array of string
    type: [String],
    required: false,
  },
},
{
  timestamps: true,
});
// add indexes
QueueMessageSchema.index({ state: 1, priority: -1, createdAt: 1 });
// partial index where state is pending
QueueMessageSchema.index({ dedupeKey: 1, type: 1 }, { unique: true, partialFilterExpression: { state: QueueMessageState.PENDING } });
QueueMessageSchema.index({ jobRunId: 1, state: 1, createdAt: 1 });
