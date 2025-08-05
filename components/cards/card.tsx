import React from 'react';
import StyledTooltip from '../page/styledTooltip';

interface CardProps {
  children: React.ReactNode;
  id: string;
  title: React.ReactNode;
  tooltip?: string;
}

export default function Card({ children, id, title, tooltip }: CardProps) {
  const tooltipId = `card-tooltip-${id}`;

  return (
    <section className='flex flex-col items-center max-w-full h-fit gap-6 relative'
      id={id}
    >
      <h2 className='text-2xl font-bold text-center' data-tooltip-id={tooltipId} data-tooltip-content={tooltip}>
        <span className='bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent'>
          {title}
        </span>
      </h2>
      <StyledTooltip id={tooltipId} />
      {children}
    </section>
  );
}
