import mongoose from 'mongoose';
import { QueueMessage, QueueMessageState, QueueMessageType } from '../db/queueMessage';

export const QueueMessageSchema = new mongoose.Schema<QueueMessage>({
  priority: {
    type: Number,
    required: true,
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
    default: [],
  },
},
{
  timestamps: true,
});
