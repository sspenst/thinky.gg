import React from 'react';
import { EnrichedLevel } from '../../models/db/level';
import StyledTooltip from '../page/styledTooltip';
import LevelCard from './levelCard';

interface LevelCardWithTitleProps {
  href?: string;
  id: string;
  level: EnrichedLevel | null | undefined;
  onClick?: () => void;
  title: React.ReactNode;
  tooltip?: string;
}

export default function LevelCardWithTitle({ href, id, level, onClick, title, tooltip }: LevelCardWithTitleProps) {
  if (level === null) {
    return null;
  }

  const tooltipId = `recommended-level-${id}`;

  return (
    <section className='rounded-xl overflow-hidden transition-all duration-300 shadow-md max-w-full flex flex-col' id={id}>
      <div className='bg-gradient-to-r from-purple-600 to-blue-600 p-2 text-white'>
        <h2
          className='text-xl font-bold text-center'
          data-tooltip-id={tooltipId}
          data-tooltip-content={tooltip}
        >
          {title}
        </h2>
      </div>
      <div className='bg-white dark:bg-gray-800 p-4 flex flex-col items-center'>
        <LevelCard
          href={href}
          id={id}
          onClick={onClick}
          level={level}
        />
        <StyledTooltip id={tooltipId} />
      </div>
    </section>
  );
}
