import Link from 'next/link';
import React from 'react';
import { EnrichedLevel } from '../models/db/level';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function EnrichedLevelLink({ level, onClick }: EnrichedLevelLinkProps) {
  return (
    <Link
      className='font-bold underline'
      href={`/level/${level.slug}`}
      onClick={onClick}
      passHref
      prefetch={false}
      style={{
        color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : undefined,
      }}
    >
      {level.name}
    </Link>
  );
}
