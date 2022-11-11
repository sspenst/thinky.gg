import Level from '../models/db/level';

export default function getDifficultyEstimate(level: Level | Partial<Level>, uniqueUsersCount: number) {
  if (!level || uniqueUsersCount < 10 || !level.calc_playattempts_duration_sum) {
    return 0;
  }

  // when we have 10 unique users, we want to return a non-zero value
  const beatenCount = level.calc_playattempts_just_beaten_count ?? 1;

  return level.calc_playattempts_duration_sum / beatenCount;
}
