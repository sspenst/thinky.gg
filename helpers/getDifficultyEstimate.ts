import Level, { EnrichedLevel } from '../models/db/level';

/**
 * calculate a scaling factor based on how many people have solved the problem
 * Base curve: logistic function
 */
export function getSolveCountFactor(solveCount: number) {
  // number of people cleared for the halfway point
  const m = 20;
  // stretch factor
  const t = 0.2;
  // maximum multiplier
  const k = 1.5;

  return ((k - 1) / (1 + Math.exp(t * (solveCount - m)))) + 1;
}

/**
 * estimate the difficulty to solve the level
 * @param level requires calc_playattempts_duration_sum and calc_playattempts_just_beaten_count
 * @param uniqueUsersCount { $size: '$calc_playattempts_unique_users' }
 */
export default function getDifficultyEstimate(
  level: Level | EnrichedLevel | Partial<Level>,
  uniqueUsersCount: number,
) {
  if (!level || uniqueUsersCount < 10 || level.calc_playattempts_duration_sum === undefined) {
    return -1;
  }

  // ensure a non-zero solveCount
  const solveCount = !level.calc_playattempts_just_beaten_count ? 1 : level.calc_playattempts_just_beaten_count;

  return level.calc_playattempts_duration_sum / solveCount * getSolveCountFactor(solveCount);
}

/**
 * estimate the difficulty to complete the level
 * @param level requires calc_playattempts_duration_before_stat_sum and calc_stats_completed_count
 * @param uniqueUsersCount { $size: { $setDifference: ['$calc_playattempts_unique_users', [userId]] } }
 */
export function getDifficultyCompletionEstimate(
  level: Level | EnrichedLevel | Partial<Level>,
  uniqueUsersCount: number,
) {
  if (!level || uniqueUsersCount < 10 || level.calc_playattempts_duration_before_stat_sum === undefined) {
    return -1;
  }

  function getCompletedCount() {
    // make sure we return a non-zero value
    if (!level.calc_stats_completed_count) {
      return 1;
    }

    // subtract 1 from calc_stats_completed_count to account for the author which has 0 playtime
    const completedCount = level.calc_stats_completed_count - 1;

    if (completedCount < 1) {
      return 1;
    }

    return completedCount;
  }

  const completedCount = getCompletedCount();

  return level.calc_playattempts_duration_before_stat_sum / completedCount * getSolveCountFactor(completedCount);
}
