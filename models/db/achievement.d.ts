import { Types } from 'mongoose';
import AchievementType from '../../constants/achievementType';
import User from './user';

interface Achievement {
  _id: Types.ObjectId;
  type: AchievementType;
  userId: Types.ObjectId & User;
}

export default Achievement;
