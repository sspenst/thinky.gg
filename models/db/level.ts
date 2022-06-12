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
  calc_avg_review_score: number;
  calc_count_unique_players: number;
  calc_count_unique_reviews: number;
}

export default Level;
