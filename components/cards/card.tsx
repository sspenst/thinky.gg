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
    <div className='flex flex-col justify-center rounded-lg max-w-full h-fit gap-4'
      id={id}
    >
      <h2 className='self-center text-xl font-bold text-center' data-tooltip-id={tooltipId} data-tooltip-content={tooltip}>
        {title}
      </h2>
      <StyledTooltip id={tooltipId} />
      {children}
    </div>
  );
}
