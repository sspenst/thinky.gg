import Dimensions from '@root/constants/dimensions';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnrichedLevel } from '../../models/db/level';
import Complete from '../level/info/complete';
import StyledTooltip from '../page/styledTooltip';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function FormattedLevelLink({ level, onClick }: EnrichedLevelLinkProps) {
  const isComplete = level.userMoves === level.leastMoves;

  return (<>
    <Link
      className='flex items-center font-bold underline w-fit max-w-full'
      data-tooltip-html={renderToStaticMarkup(
        <Image
          alt={level.name}
          className='max-w-full'
          height={Dimensions.LevelCanvasHeight / 3}
          src={'/api/level/image/' + level._id + '.png'}
          width={Dimensions.LevelCanvasWidth / 3}
        />
      )}
      data-tooltip-id={`formatted-level-link-${level._id.toString()}`}
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
    <StyledTooltip id={`formatted-level-link-${level._id.toString()}`} />
  </>);
}
