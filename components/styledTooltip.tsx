import React from 'react';
import { Tooltip } from 'react-tooltip';

interface StyledTooltipProps {
  id: string;
}

export default function StyledTooltip({ id }: StyledTooltipProps) {
  return (
    <Tooltip
      border='2px solid var(--bg-color-4)'
      id={id}
      noArrow
      opacity={1}
      style={{
        backgroundColor: 'var(--bg-color)',
        borderRadius: 6,
        color: 'var(--color)',
        fontSize: '0.7rem',
        padding: '0.25rem 0.35rem 0.25rem 0.35rem',
        zIndex: 100,
      }}
    />
  );
}
