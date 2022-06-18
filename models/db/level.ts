import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
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
  calc_records_last_ts: number;
  calc_reviews_score_avg: number;
  calc_reviews_score_count: number;
  calc_reviews_score_laplace:number;
  calc_stats_players_beaten: number;
}

export default Level;
