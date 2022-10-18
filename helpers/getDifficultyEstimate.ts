import Level from '../models/db/level';

export default function getDifficultyEstimate(level: Level | Partial<Level> | null) {
  if (!level || !level.calc_playattempts_unique_users || level.calc_playattempts_unique_users.length < 10 || !level.calc_playattempts_duration_sum || !level.calc_playattempts_just_beaten_count) {
    return 0;
  }

  return level.calc_playattempts_duration_sum / level.calc_playattempts_just_beaten_count;
}
