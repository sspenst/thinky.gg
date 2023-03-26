import React from 'react';
import { Tooltip } from 'react-tooltip';

interface StyledTooltipProps {
  id: string;
}

export default function StyledTooltip({ id }: StyledTooltipProps) {
  return (
    <Tooltip
      id={id}
      noArrow
      style={{
        backgroundColor: 'var(--bg-color)',
        borderColor: 'var(--bg-color-4)',
        borderRadius: 6,
        borderWidth: 2,
        color: 'var(--color)',
        fontSize: '0.7rem',
        opacity: 1,
        padding: '0.25rem 0.35rem 0.25rem 0.35rem',
      }}
    />
  );
}
