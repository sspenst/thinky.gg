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
  DISCORD_NOTIFICATION = 'DISCORD_NOTIFICATION',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICAITON',
  FETCH = 'FETCH',
  PUBLISH_LEVEL = 'PUBLISH_LEVEL',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  REFRESH_INDEX_CALCULATIONS = 'REFRESH_INDEX_CALCULATIONS',
  REFRESH_ACHIEVEMENTS = 'REFRESH_ACHIEVEMENTS',
  GEN_LEVEL_IMAGE = 'GEN_LEVEL_IMAGE'
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
  runAt: {
    type: Date,
    required: true,
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

QueueMessageSchema.index({ state: 1, priority: -1, createdAt: 1 });
QueueMessageSchema.index({ dedupeKey: 1, type: 1 }, { unique: true, partialFilterExpression: { state: QueueMessageState.PENDING } });
QueueMessageSchema.index({ jobRunId: 1, state: 1, createdAt: 1 });

export default QueueMessageSchema;
