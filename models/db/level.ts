import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.levels collection
interface Level {
  _id: Types.ObjectId;
  authorNote?: string;
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
  points: number;
  psychopathId?: number;
  slug: string;
  ts: number;
  userId: Types.ObjectId & User;
  width: number;
}

export default Level;

export function cloneLevel(level: Level) {
  return {
    _id: level._id,
    authorNote: level.authorNote,
    calc_playattempts_count: level.calc_playattempts_count,
    calc_playattempts_duration_sum: level.calc_playattempts_duration_sum,
    calc_playattempts_just_beaten_count: level.calc_playattempts_just_beaten_count,
    calc_playattempts_unique_users: level.calc_playattempts_unique_users,
    calc_reviews_count: level.calc_reviews_count,
    calc_reviews_score_avg: level.calc_reviews_score_avg,
    calc_reviews_score_laplace: level.calc_reviews_score_laplace,
    calc_stats_players_beaten: level.calc_stats_players_beaten,
    data: level.data,
    height: level.height,
    isDraft: level.isDraft,
    leastMoves: level.leastMoves,
    name: level.name,
    points: level.points,
    psychopathId: level.psychopathId,
    slug: level.slug,
    ts: level.ts,
    userId: level.userId,
    width: level.width,
  } as Level;
}
