export const LEVEL_DEFAULT_PROJECTION = {
  _id: 1,
  calc_difficulty_completion_estimate: 1,
  calc_difficulty_estimate: 1,
  calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
  calc_playattempts_unique_users_count_excluding_author: { $size: { $setDifference: ['$calc_playattempts_unique_users', ['$userId']] } },
  data: 1,
  gameId: 1,
  height: 1,
  isRanked: 1,
  leastMoves: 1,
  name: 1,
  slug: 1,
  userId: 1,
  width: 1,
};

export const LEVEL_SEARCH_DEFAULT_PROJECTION = {
  calc_reviews_score_laplace: 1,
  calc_stats_players_beaten: 1,
  calc_reviews_count: 1,
  ts: 1,
  ...LEVEL_DEFAULT_PROJECTION,
};
