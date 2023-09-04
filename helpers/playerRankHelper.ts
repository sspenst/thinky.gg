import { DIFFICULTY_NAMES, DIFFICULTY_PRETTY_NAMES, getDifficultyList } from '@root/components/formatted/formattedDifficulty';

// TODO: reconcile with AchievementScoreInfo
const difficultyRequirements = [
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.SUPER_GRANDMASTER],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.GRANDMASTER],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] + rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PROFESSOR],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] >= 10;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.PHD],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] >= 10;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.MASTERS],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] >= 10;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.BACHELORS],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] >= 25;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.HIGH_SCHOOL],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] >= 25;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.JUNIOR_HIGH],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] >= 25;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.ELEMENTARY],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] >= 25;
    },
  },
  {
    name: DIFFICULTY_PRETTY_NAMES[DIFFICULTY_NAMES.KINDERGARTEN],
    requirement: (rollingLevelCompletionSum: number[] ) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] >= 25;
    },
  }
];

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

export function getPlayerRank(levelsCompletedByDifficulty: { [key: string]: number }): string {
  // rolling sum should add up all from previous keys into current key
  const rollingSum = getDifficultyRollingSum(levelsCompletedByDifficulty);
  const val = difficultyRequirements.find((difficultyRequirement) => difficultyRequirement.requirement(rollingSum))?.name || 'No rank';

  return val;
}
