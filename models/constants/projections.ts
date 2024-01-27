export const LEVEL_DEFAULT_PROJECTION = {
  _id: 1,
  backgroundImageUrl: 1,
  calc_difficulty_completion_estimate: 1,
  calc_difficulty_estimate: 1,
  calc_playattempts_unique_users_count: { $size: '$calc_playattempts_unique_users' },
  // filter out userId AND userId._id because it could be that the field is populated in an aggregate from a lookup
  // TODO: any time a userId is populated we should be putting the populated object in a new 'user' field to avoid confusion and make usage more clear
  calc_playattempts_unique_users_count_excluding_author: { $size: { $setDifference: ['$calc_playattempts_unique_users', ['$userId', '$userId._id']] } },
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
