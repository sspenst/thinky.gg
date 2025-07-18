import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import Level from './level';
import User from './user';

interface SocialShare {
  _id: Types.ObjectId;
  userId: Types.ObjectId | User;
  levelId: Types.ObjectId | Level;
  platform: string; // 'X', 'Facebook', 'LinkedIn', 'Reddit', 'Telegram'
  gameId: GameId;
  createdAt: Date;
  updatedAt: Date;
}

export default SocialShare;