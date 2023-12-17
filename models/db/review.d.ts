import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import Level, { EnrichedLevel } from './level';
import User from './user';

interface Review {
  _id: Types.ObjectId;
  gameId: GameId;
  isDeleted: boolean;
  levelId: (Types.ObjectId & Level) | EnrichedLevel;
  score: number;
  text?: string;
  ts: number;
  userId: Types.ObjectId & User;
}

export interface ReviewWithStats extends Review {
  stat?: {
    complete: boolean;
    moves: number;
    ts: number;
  };
}

export default Review;
