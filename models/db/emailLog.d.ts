import NotificationType from '@root/constants/notificationType';
import { Types } from 'mongoose';
import { EmailType } from '../../constants/emailDigest';
import { EmailState } from '../schemas/emailLogSchema';

interface EmailLog {
  _id: Types.ObjectId;
  batchId: Types.ObjectId;
  createdAt: Date;
  error: string,
  state: EmailState;
  subject: string;
  type: EmailType | NotificationType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default EmailLog;
