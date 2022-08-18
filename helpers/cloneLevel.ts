import Level from '../models/db/level';

export default function cloneLevel(level: Level) {
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
