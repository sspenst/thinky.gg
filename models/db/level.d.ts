import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
  calc_difficulty_estimate: number;
  calc_playattempts_count: number;
  calc_playattempts_duration_sum: number;
  calc_playattempts_just_beaten_count: number;
  calc_playattempts_unique_users: Types.ObjectId[];
  calc_reviews_count: number;
  calc_reviews_score_avg: number;
  calc_reviews_score_laplace: number;
  calc_stats_players_beaten: number;
  data: string;
  height: number;
  isDraft: boolean;
  leastMoves: number;
  name: string;
  slug: string;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
}

export interface EnrichedLevel extends Level {
  userAttempts?: number;
  userMoves?: number;
  userMovesTs?: number;
}

export default Level;
