import Level, { EnrichedLevel } from '../models/db/level';

export const DIFFICULTY_LOGISTIC_M = 20;
export const DIFFICULTY_LOGISTIC_T = 0.2;
export const DIFFICULTY_LOGISTIC_K = 1.5;

export default function getDifficultyEstimate(
  level: Level | EnrichedLevel | Partial<Level>,
  uniqueUsersCount: number,
) {
  if (!level || uniqueUsersCount < 10 || level.calc_playattempts_duration_sum === undefined) {
    return -1;
  }

  // when we have 10 unique users, we want to return a non-zero value
  const solveCount = !level.calc_playattempts_just_beaten_count ? 1 : level.calc_playattempts_just_beaten_count;

  // calculate a scaling factor based on how many people have solved the problem
  // Base curve: logistic function
  // m: number of people cleared for the halfway point
  // t: stretch factor
  // k: maximum multiplier
  const m = DIFFICULTY_LOGISTIC_M;
  const t = DIFFICULTY_LOGISTIC_T;
  const k = DIFFICULTY_LOGISTIC_K;
  const solveCountFactor = ((k - 1) / (1 + Math.exp(t * (solveCount - m)))) + 1;

  return level.calc_playattempts_duration_sum / solveCount * solveCountFactor;
}
