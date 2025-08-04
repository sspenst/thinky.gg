import TimeRange from '@root/constants/timeRange';
import Link from 'next/link';
import FormattedDifficulty, { difficultyList, getDifficultyColor } from '../formatted/formattedDifficulty';

interface LevelsSolvedByDifficultyListProps {
  levelsSolvedByDifficulty: {[key: string]: number};
}

export default function LevelsSolvedByDifficultyList({ levelsSolvedByDifficulty }: LevelsSolvedByDifficultyListProps) {
  return (
    <div className='space-y-1'>
      {difficultyList.map((difficulty) => {
        const levelsSolved = difficulty.value in levelsSolvedByDifficulty && levelsSolvedByDifficulty[difficulty.value] || 0;

        // don't show pending unless we have to
        if (difficulty.name === 'Pending' && levelsSolved === 0) {
          return null;
        }

        return (
          <Link
            className='flex items-center justify-between py-2 px-3 rounded-md bg-white/5 hover:bg-white/10 transition-all duration-200 group'
            href={{
              pathname: '/search',
              query: {
                difficultyFilter: difficulty.name,
                timeRange: TimeRange[TimeRange.All],
              },
            }}
            key={`${difficulty.name}-levels-solved`}
          >
            <div className='flex items-center gap-2'>
              <FormattedDifficulty difficulty={difficulty} id='level-solved-by-difficulty-list' />
            </div>
            
            <span
              className='font-bold'
              style={{ color: levelsSolved > 0 ? getDifficultyColor(difficulty.value) : 'rgb(156 163 175)' }}
            >
              {levelsSolved}
            </span>
          </Link>
        );
      }).reverse()}
    </div>
  );
}
