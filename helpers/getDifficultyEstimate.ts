import Level from '../models/db/level';

export default function getDifficultyEstimate(level: Level | Partial<Level>, uniqueUsersCount: number) {
  if (!level || uniqueUsersCount < 10 || !level.calc_playattempts_duration_sum || !level.calc_playattempts_just_beaten_count) {
    return 0;
  }

  return level.calc_playattempts_duration_sum / level.calc_playattempts_just_beaten_count;
}
