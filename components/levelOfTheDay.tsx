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
    <div className='flex flex-col justify-center rounded-lg border'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <h3 className='self-center px-4 pt-3 text-lg font-bold'>
        Level of the Day:
      </h3>
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
  );
}
