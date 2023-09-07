import { getDifficultyList } from '@root/components/formatted/formattedDifficulty';

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
