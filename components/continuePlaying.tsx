import React from 'react';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import SelectCard from './selectCard';

interface ContinuePlayingProps {
  level: EnrichedLevel;
}

export default function ContinuePlaying({ level }: ContinuePlayingProps): JSX.Element {
  return (
    <div className='flex justify-center m-4'>
      <div className='flex flex-wrap justify-center rounded-lg border gap-2 pl-4'
        style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-3)',
        }}
      >
        <div className='flex flex-col items-center vertical-center self-center'>
          <span className='text-lg font-bold'>Continue playing:</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-play-circle p-2 h-12 w-12" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z" />
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
