import { difficultyList } from '@root/components/formatted/formattedDifficulty';

export function getDifficultyRollingSum(levelsSolvedByDifficulty: { [key: string]: number }): number[] {
  let acc = 0;
  const rollingSum = difficultyList.slice().reverse().map((difficulty) => {
    const add = levelsSolvedByDifficulty[difficulty.value] || 0;
    const amount = acc + add;

    acc += add;

    return amount;
  }).reverse();

  return rollingSum;
}
