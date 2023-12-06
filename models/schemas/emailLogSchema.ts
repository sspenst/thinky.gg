import { GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import mongoose from 'mongoose';
import { EmailType } from '../../constants/emailDigest';
import EmailLog from '../db/emailLog';

export enum EmailState {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

const EmailLogSchema = new mongoose.Schema<EmailLog>(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    error: {
      type: String,
      required: false,
    },
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
    state: {
      type: String,
      required: true,
      enum: EmailState,
    },
    subject: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values({ ...EmailType, ...NotificationType }),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EmailLogSchema.index({ userId: 1 });
EmailLogSchema.index({ type: 1 });

export default EmailLogSchema;
