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
    <section className='relative max-w-full flex flex-col' id={id}>
      <div className='relative'>
        {/* Floating Island Effect */}
        <div className='absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 blur-xl' />
        <div className='relative rounded-2xl overflow-hidden border border-white/20 backdrop-blur-sm bg-white/5 shadow-xl hover:scale-105 transform transition-all duration-300'>
          <div className='bg-gradient-to-r from-cyan-600/80 to-purple-600/80 p-4 backdrop-blur-md'>
            <h2
              className='text-xl font-bold text-center text-white'
              data-tooltip-id={tooltipId}
              data-tooltip-content={tooltip}
            >
              {title}
            </h2>
          </div>
          <div className='p-6 flex flex-col items-center'>
            <LevelCard
              href={href}
              id={id}
              onClick={onClick}
              level={level}
            />
            <StyledTooltip id={tooltipId} />
          </div>
        </div>
      </div>
    </section>
  );
}
