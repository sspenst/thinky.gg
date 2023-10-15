import { Types } from 'mongoose';
import NotificationType from '../../constants/notificationType';
import Collection from './collection';
import { EnrichedLevel } from './level';
import User from './user';

interface Notification {
  _id: Types.ObjectId;
  createdAt: Date;
  message?: string;
  gameId?: string;
  read: boolean;
  source: User | Achievement | null;
  sourceModel: string;
  target: User | EnrichedLevel | Collection;
  targetModel: string;
  type: NotificationType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Notification;
