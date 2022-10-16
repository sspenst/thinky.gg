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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
    },
    state: {
      type: String,
      required: true,
      enum: EmailState,
    },
    type: {
      type: String,
      required: true,
      enum: EmailType,
    },
  },
  {
    timestamps: true,
  }
);

// add index on userId
EmailLogSchema.index({ userId: 1 });
// add index on type
EmailLogSchema.index({ type: 1 });

export default EmailLogSchema;
