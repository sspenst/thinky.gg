import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import { AttemptContext } from '../schemas/playAttemptSchema';
import Level from './level';
import User from './user';

interface PlayAttempt {
  _id: Types.ObjectId;
  attemptContext: AttemptContext;
  endTime: number;
  gameId: GameId;
  isDeleted: boolean;
  levelId: Types.ObjectId | Level;
  startTime: number;
  updateCount: number;
  userId: Types.ObjectId | User;
}

export default PlayAttempt;
