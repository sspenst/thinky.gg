import React from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

export default function LevelsSolvedByDifficultyList({ data: levelsSolvedByDifficulty }: {data: {[key: string]: number}}) {
  return difficultyList.map(difficulty => {
    const levelsSolved = difficulty.value in levelsSolvedByDifficulty && levelsSolvedByDifficulty[difficulty.value] || 0;

    // don't show pending unless we have to
    if (difficulty.name === 'Pending' && levelsSolved === 0) {
      return null;
    }

    return (
      <div className='flex text-sm' key={`${difficulty.name}-levels-solved`}>
        <div className='w-10 text-right mr-2'>
          {levelsSolved}
        </div>
        <FormattedDifficulty difficulty={difficulty} id='level-solved-by-difficulty-list' />
      </div>
    );
  }).reverse();
}
