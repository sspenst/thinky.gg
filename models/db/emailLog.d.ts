import { Types } from 'mongoose';
import { EmailKVTypes, EmailType } from '../../constants/emailDigest';
import { EmailState } from '../schemas/emailLogSchema';

// represents a document from the pathology.images collection
interface EmailLog {
  _id: Types.ObjectId;
  createdAt: Date;
  userId: Types.ObjectId & User;
  subject: string;
  state: EmailState;
  type: EmailType;
  updatedAt: Date;

}

export default EmailLog;
