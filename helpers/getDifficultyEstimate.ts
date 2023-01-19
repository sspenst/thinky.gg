import Level from '../models/db/level';

export default function getDifficultyEstimate(level: Level | Partial<Level>, uniqueUsersCount: number) {
  if (!level || uniqueUsersCount < 10 || !level.calc_playattempts_duration_sum) {
    return -1;
  }

  // when we have 10 unique users, we want to return a non-zero value
  const beatenCount = !level.calc_playattempts_just_beaten_count ? 1 : level.calc_playattempts_just_beaten_count;

  // calculate a scaling factor based on how many people have solved the problem
  // Base curve: logistic function
  // m: number of people cleared for the halfway point
  // t: stretch factor
  // k: maximum multiplier
  const m = 20;
  const t = 0.2;
  const k = 1.5;
  const beatenCountFactor = ((k - 1) / (1 + Math.exp(t * (beatenCount - m)))) + 1;

  return level.calc_playattempts_duration_sum / beatenCount * beatenCountFactor;
}
