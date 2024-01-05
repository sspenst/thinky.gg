import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import Level from './level';
import User from './user';

interface Stat {
  _id: Types.ObjectId;
  attempts: number;
  complete: boolean;
  createdAt: Date;
  gameId: GameId;
  isDeleted: boolean;
  levelId: Types.ObjectId & Level;
  moves: number;
  ts: number;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Stat;
