import Link from 'next/link';
import React from 'react';
import { EnrichedLevel } from '../models/db/level';
import Complete from './complete';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function EnrichedLevelLink({ level, onClick }: EnrichedLevelLinkProps) {
  const isComplete = level.userMoves === level.leastMoves;

  return (
    <Link
      className='flex items-center font-bold underline'
      href={`/level/${level.slug}`}
      onClick={onClick}
      passHref
      prefetch={false}
      style={{
        color: level.userMoves ? (isComplete ? 'var(--color-complete)' : 'var(--color-incomplete)') : undefined,
        // to handle zero width level names
        minWidth: 10,
      }}
    >
      <span className='truncate'>{level.name}</span>
      {isComplete && <Complete className='-mr-1' />}
    </Link>
  );
}
