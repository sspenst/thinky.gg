import { Types } from 'mongoose';
import AchievementType from '../../constants/achievements/achievementType';
import User from './user';

interface Achievement {
  _id: Types.ObjectId;
  createdAt: Date;
  gameId?: string;
  type: AchievementType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Achievement;
