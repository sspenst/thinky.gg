import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
  calc_playattempts_count: number;
  calc_playattempts_duration_sum: number;
  calc_playattempts_just_beaten_count: number;
  calc_reviews_count: number;
  calc_reviews_score_avg: number;
  calc_reviews_score_laplace:number;
  calc_stats_players_beaten: number;
  data: string;
  height: number;
  isDraft: boolean;
  leastMoves: number;
  name: string;
  points: number;
  psychopathId?: number;
  slug: string;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
}

export default Level;
