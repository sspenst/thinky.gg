import { Types } from 'mongoose';
import AchievementType from '../../constants/achievementType';
import { EnrichedLevel } from './level';
import User from './user';

interface Achievement {
    type: AchievementType;
    tag: string;
    userId: Types.ObjectId & User;
    createdAt: Date; 
}

export default Achievement;