import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import AchievementType from '../../constants/achievements/achievementType';
import User from './user';

interface Achievement {
  _id: Types.ObjectId;
  createdAt: Date;
  gameId: GameId;
  type: AchievementType;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Achievement;
