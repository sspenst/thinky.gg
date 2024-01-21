import { GameType } from '@root/constants/Games';
import StatFilter from '@root/constants/statFilter';
import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

interface LevelsSolvedByDifficultyListProps {
  levelsSolvedByDifficulty: {[key: string]: number};
  linksToSearch: boolean;
}

export default function LevelsSolvedByDifficultyList({ levelsSolvedByDifficulty, linksToSearch }: LevelsSolvedByDifficultyListProps) {
  const { game } = useContext(AppContext);
  const router = useRouter();

  return difficultyList.map(difficulty => {
    const levelsSolved = difficulty.value in levelsSolvedByDifficulty && levelsSolvedByDifficulty[difficulty.value] || 0;

    // don't show pending unless we have to
    if (difficulty.name === 'Pending' && levelsSolved === 0) {
      return null;
    }

    const statFilterType = game?.type === GameType.COMPLETE_AND_SHORTEST ? StatFilter.Completed : StatFilter.Solved;

    return (
      <div className={'flex text-sm ' + (linksToSearch ? 'cursor-pointer' : '')}
        key={`${difficulty.name}-levels-solved`} onClick={() => {
          if (linksToSearch) {
            const url = `/search?statFilter=${statFilterType}&difficultyFilter=${difficulty.name}`;

            router.push(url);
          }
        }}>
        <div className='w-10 text-right mr-2'>
          {levelsSolved}
        </div>
        <FormattedDifficulty difficulty={difficulty} id='level-solved-by-difficulty-list' />
      </div>
    );
  }).reverse();
}
