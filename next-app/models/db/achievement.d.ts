import { Types } from 'mongoose';
import AchievementType from '../../constants/achievementType';
import User from './user';

interface Achievement {
  _id: Types.ObjectId;
  createdAt: Date;
  type: AchievementType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Achievement;
