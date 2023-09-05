import Link from 'next/link';
import React from 'react';
import { EnrichedLevel } from '../../models/db/level';
import Complete from '../level/info/complete';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function FormattedLevelLink({ level, onClick }: EnrichedLevelLinkProps) {
  const isComplete = level.userMoves === level.leastMoves;

  return (
    <Link
      className='flex items-center font-bold underline w-fit max-w-full'
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
