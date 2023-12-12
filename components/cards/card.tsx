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
    <div className='flex flex-col justify-center rounded-lg border max-w-full'
      id={id}
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <h2 className='self-center px-4 pt-3 text-lg font-bold text-center' data-tooltip-id={tooltipId} data-tooltip-content={tooltip}>
        {title}
      </h2>
      <StyledTooltip id={tooltipId} />
      {children}
    </div>
  );
}
