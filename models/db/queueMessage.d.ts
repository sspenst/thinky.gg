import { Types } from 'mongoose';
import { QueueMessageState, QueueMessageType } from '../schemas/queueMessageSchema';

interface QueueMessage {
  _id: Types.ObjectId;
  createdAt: Date; // when the message was created
  runAt: Date; // when the message should be run
  dedupeKey?: string;
  isProcessing: boolean;
  jobRunId: Types.ObjectId; // which job run it belongs to
  log: string[]; // array of string for logging
  message: string; // the message to send
  priority: number; // higher priority is higher number
  processingAttempts: number; // how many times the message has been attempted
  processingCompletedAt: Date; // when the message was completed
  processingStartedAt: Date;
  state: QueueMessageState;
  type: QueueMessageType; // which queue it belongs to
  updatedAt: Date; // when the message was last updated
}

export default QueueMessage;
