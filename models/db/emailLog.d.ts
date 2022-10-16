import { Types } from 'mongoose';
import { EmailType } from '../../constants/emailDigest';
import { EmailState } from '../schemas/emailLogSchema';

interface EmailLog {
  _id: Types.ObjectId;
  createdAt: Date;
  state: EmailState;
  subject: string;
  type: EmailType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default EmailLog;
