import { DIFFICULTY_NAMES, DIFFICULTY_PRETTY_NAMES, getDifficultyList } from '@root/components/formatted/formattedDifficulty';
import { AchievementRulesTableLevelCompletion } from '@root/constants/achievements/AchievementRulesTableLevelCompletion';
import AchievementType from '@root/constants/achievements/achievementType';

export function getDifficultyRollingSum(levelsCompletedByDifficulty: { [key: string]: number }): number[] {
  let acc = 0;
  const rollingSum = getDifficultyList().reverse().map((difficulty) => {
    const add = levelsCompletedByDifficulty[difficulty.value] || 0;
    const amount = acc + add;

    acc += add;

    return amount;
  }).reverse();

  return rollingSum;
}

const difficultyRequirements = [
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.SUPER_GRANDMASTER],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_SUPER_GRANDMASTER].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.GRANDMASTER],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_GRANDMASTER].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PROFESSOR],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_PROFESSOR].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PHD],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_PHD].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.MASTERS],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_MASTERS].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.BACHELORS],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_BACHELORS].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.HIGH_SCHOOL],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_HIGH_SCHOOL].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.JUNIOR_HIGH],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_JUNIOR_HIGH].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.ELEMENTARY],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_ELEMENTARY].unlocked,
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.KINDERGARTEN],
    requirement: AchievementRulesTableLevelCompletion[AchievementType.PLAYER_RANK_KINDERGARTEN].unlocked,
  },

];

export function getPlayerRank(levelsCompletedByDifficulty: { [key: string]: number }): string {
  // TODO: reconcile with AchievementScoreInfo

  // rolling sum should add up all from previous keys into current key
  const rollingSum = getDifficultyRollingSum(levelsCompletedByDifficulty);

  const val = difficultyRequirements.find((difficultyRequirement) => difficultyRequirement.requirement({ rollingLevelCompletionSum: rollingSum }))?.name || 'No rank';

  return val;
}
