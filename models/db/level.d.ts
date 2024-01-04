import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import User from './user';

interface Level {
  _id: Types.ObjectId;
  archivedBy?: Types.ObjectId & User;
  archivedTs?: number;
  authorNote?: string;
  calc_difficulty_estimate: number;
  calc_difficulty_completion_estimate: number;
  calc_playattempts_duration_before_stat_sum: number;
  calc_playattempts_duration_sum: number;
  calc_playattempts_just_beaten_count: number;
  calc_playattempts_unique_users: Types.ObjectId[];
  calc_reviews_count: number;
  calc_reviews_score_avg: number;
  calc_reviews_score_laplace: number;
  calc_stats_players_beaten: number;
  data: string;
  gameId: GameId;
  height: number;
  isDeleted: boolean;
  isDraft: boolean;
  isRanked: boolean;
  leastMoves: number;
  name: string;
  slug: string;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
}

export interface EnrichedLevel extends Level {
  calc_playattempts_unique_users_count?: number;
  userAttempts?: number;
  userMoves?: number;
  userMovesTs?: number;
}

export default Level;
