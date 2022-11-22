import { Types } from 'mongoose';
import NotificationType from '../../constants/notificationType';
import { EnrichedLevel } from './level';
import User from './user';

interface Achievement {
    type: NotificationType;
    userId: Types.ObjectId & User;
    createdAt: Date; 
}

export default Achievement;