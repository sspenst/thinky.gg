import { Game, GameType } from '@root/constants/Games';
import { useRouter } from 'next/router';
import React from 'react';
import FormattedDifficulty, { difficultyList } from '../formatted/formattedDifficulty';

export default function LevelsSolvedByDifficultyList({ data: levelsSolvedByDifficulty, game, linksToSearch }: {data: {[key: string]: number}, game: Game, linksToSearch: boolean}) {
  const router = useRouter();

  return difficultyList.map(difficulty => {
    const levelsSolved = difficulty.value in levelsSolvedByDifficulty && levelsSolvedByDifficulty[difficulty.value] || 0;

    // don't show pending unless we have to
    if (difficulty.name === 'Pending' && levelsSolved === 0) {
      return null;
    }

    const statFilterType = game?.type === GameType.COMPLETE_AND_SHORTEST ? 'inProgress' : 'solved';

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
