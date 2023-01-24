import React from 'react';
import Dimensions from '../constants/dimensions';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import SelectCard from './selectCard';

interface RecommendedLevelProps {
  level: EnrichedLevel;
  title: string
}

export default function RecommendedLevel({ level, title }: RecommendedLevelProps): JSX.Element {
  return (
    <div className='flex flex-col justify-center rounded-lg border'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <h2 className='self-center px-4 pt-3 text-lg font-bold'>
        {title}
      </h2>
      <SelectCard
        option={{
          author: level.userId.name,
          height: Dimensions.OptionHeightLarge,
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
