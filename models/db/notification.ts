import { Types } from 'mongoose';
import { EnrichedLevel } from '../../pages/search';
import User from './user';

// represents a document from the pathology.notifications collection
interface Notification {
  _id: Types.ObjectId;
  createdAt: Date;
  message?: string;
  read: boolean;
  source: User | null;
  sourceModel: string;
  target: User | EnrichedLevel;
  targetModel: string;
  type: string;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Notification;
