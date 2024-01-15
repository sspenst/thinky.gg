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
    <section className='flex flex-col items-center gap-3 max-w-full' id={id}>
      <h2
        className='px-1 text-xl font-bold'
        data-tooltip-id={tooltipId}
        data-tooltip-content={tooltip}
      >
        {title}
      </h2>
      <LevelCard
        href={href}
        id={id}
        onClick={onClick}
        level={level}
      />
      <StyledTooltip id={tooltipId} />
    </section>
  );
}
