import React from 'react';
import FormattedDifficulty, { getDifficultyList } from '../formatted/formattedDifficulty';

export default function LevelsCompletedByDifficultyList({ data: levelsCompletedByDifficulty }: {data: {[key: string]: number}}) {
  return getDifficultyList().reverse().map(difficulty => {
    const levelsCompleted = difficulty.value in levelsCompletedByDifficulty && levelsCompletedByDifficulty[difficulty.value] || 0;

    // don't show pending unless we have to
    if (difficulty.name === 'Pending' && levelsCompleted === 0) {
      return null;
    }

    return (
      <div className='flex text-sm' key={`${difficulty.name}-levels-completed`}>
        <div className='w-10 text-right mr-2'>
          {levelsCompleted}
        </div>
        <FormattedDifficulty difficultyEstimate={difficulty.value} id={difficulty.name} />
      </div>
    );
  });
}
