import mongoose from 'mongoose';
import QueueMessage from '../db/queueMessage';

export enum QueueMessageState {
  PENDING = 'pending', // ready to be processed
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum QueueMessageType {
  CALC_CREATOR_COUNTS = 'CALC_CREATOR_COUNTS',
  CALC_PLAY_ATTEMPTS = 'CALC_PLAY_ATTEMPTS',
  FETCH = 'FETCH',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICAITON',
  REFRESH_INDEX_CALCULATIONS = 'REFRESH_INDEX_CALCULATIONS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
}

const QueueMessageSchema = new mongoose.Schema<QueueMessage>({
  dedupeKey: {
    type: String,
    required: false,
  },
  isProcessing: {
    type: Boolean,
    default: false,
  },
  jobRunId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  log: {
    type: [String],
    required: false,
  },
  message: {
    type: String,
    required: true,
  },
  priority: {
    type: Number,
    required: false,
    default: 0,
  },
  processingAttempts: {
    type: Number,
    default: 0,
  },
  processingCompletedAt: {
    type: Date,
    required: false,
  },
  processingStartedAt: {
    type: Date,
    required: false,
  },
  state: {
    type: String,
    required: true,
    enum: QueueMessageState,
  },
  type: {
    type: String,
    required: true,
    enum: QueueMessageType,
  },
},
{
  timestamps: true,
});

// add indexes
QueueMessageSchema.index({ state: 1, priority: -1, createdAt: 1 });
// partial index where state is pending or processing
QueueMessageSchema.index({ dedupeKey: 1, type: 1 }, { unique: true, partialFilterExpression: { state: QueueMessageState.PENDING } });

QueueMessageSchema.index({ jobRunId: 1, state: 1, createdAt: 1 });

export default QueueMessageSchema;
