import React from 'react';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import SelectCard from './selectCard';

interface LevelOfTheDayProps {
  level: EnrichedLevel;
}

export default function LevelOfTheDay({ level }: LevelOfTheDayProps): JSX.Element {
  return (
    <div className='flex justify-center m-4'>
      <div className='flex flex-wrap justify-center rounded-lg border gap-2 pl-4'
        style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-3)',
        }}
      >
        <div className='flex flex-col items-center vertical-center self-center'>
          <span className='text-lg font-bold'>Level of the Day:</span>
          <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='bi bi-calendar-event p-2 h-12 w-12' viewBox='0 0 16 16'>
            <path d='M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z' />
            <path d='M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z' />
          </svg>
        </div>
        <SelectCard
          option={{
            author: level.userId.name,
            hideDifficulty: true,
            href: `/level/${level.slug}`,
            id: level._id.toString(),
            level: level,
            stats: new SelectOptionStats(level.leastMoves, level.userMoves),
            text: level.name,
          } as SelectOption}
        />
      </div>
    </div>
  );
}
