import { Types } from 'mongoose';
import { EnrichedLevel } from '../../pages/search';
import User from './user';

interface Notification {
    _id: Types.ObjectId;
    userId: Types.ObjectId & User;
    createdAt: Date;
    updatedAt: Date;
    source: User | null;
    sourceModel: string;
    target: User | EnrichedLevel,
    targetModel: string;
    message?: string;
    read: boolean;
    type: string;
}

export default Notification;
