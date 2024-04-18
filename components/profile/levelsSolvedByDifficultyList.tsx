import Link from 'next/link';
import React from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

interface LevelsSolvedByDifficultyListProps {
  levelsSolvedByDifficulty: {[key: string]: number};
}

export default function LevelsSolvedByDifficultyList({ levelsSolvedByDifficulty }: LevelsSolvedByDifficultyListProps) {
  return difficultyList.map(difficulty => {
    const levelsSolved = difficulty.value in levelsSolvedByDifficulty && levelsSolvedByDifficulty[difficulty.value] || 0;

    // don't show pending unless we have to
    if (difficulty.name === 'Pending' && levelsSolved === 0) {
      return null;
    }

    return (
      <Link
        className='flex text-sm w-fit'
        href={{
          pathname: '/search',
          query: {
            difficultyFilter: difficulty.name,
          },
        }}
        key={`${difficulty.name}-levels-solved`}
      >
        <div className='w-10 text-right mr-2'>
          {levelsSolved}
        </div>
        <FormattedDifficulty difficulty={difficulty} id='level-solved-by-difficulty-list' />
      </Link>
    );
  }).reverse();
}
