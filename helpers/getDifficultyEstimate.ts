import Level from '../models/db/level';

export default function getDifficultyEstimate(level: Level | Partial<Level> | null) {
  // check if level.calc_playattempts_unique_users is a number
  // if it is, then it's already been calculated
  let numUsers;

  if (typeof level?.calc_playattempts_unique_users === 'number') {
    numUsers = level.calc_playattempts_unique_users;
  } else {
    numUsers = level?.calc_playattempts_unique_users?.length;
  }

  if (!level || !numUsers || numUsers < 10 || !level.calc_playattempts_duration_sum || !level.calc_playattempts_just_beaten_count) {
    return 0;
  }

  return level.calc_playattempts_duration_sum / level.calc_playattempts_just_beaten_count;
}
