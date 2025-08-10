import React from 'react';
import { Tooltip } from 'react-tooltip';

interface StyledTooltipProps {
  id: string;
  style?: React.CSSProperties;
}

export default function StyledTooltip({ id, style }: StyledTooltipProps) {
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
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: '1rem',
        maxWidth: 'calc(100vw - 0.7rem)',
        padding: '0.25rem 0.35rem 0.25rem 0.35rem',
        zIndex: 9999,
        ...style,
      }}
    />
  );
}
