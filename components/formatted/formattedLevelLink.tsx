import Dimensions from '@root/constants/dimensions';
import { BASE_DOMAIN, BASE_PROTOCOL, Game, Games } from '@root/constants/Games';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnrichedLevel } from '../../models/db/level';
import Solved from '../level/info/solved';
import StyledTooltip from '../page/styledTooltip';

interface EnrichedLevelLinkProps {
  // NB: this id should not contain the level id
  id: string;
  game: Game;
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function FormattedLevelLink({ id, game, level, onClick }: EnrichedLevelLinkProps) {
  const isSolved = level.userMoves === level.leastMoves;
  const tooltipId = `formatted-level-link-${level._id.toString()}-${id}`;
  const baseUrl = BASE_PROTOCOL + game.id + '.' + BASE_DOMAIN + '' || '';

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
      data-tooltip-id={tooltipId}
      href={baseUrl + `/level/${level.slug}`}
      onClick={onClick}
      passHref
      prefetch={false}
      style={{
        color: level.userMoves ? (isSolved ? 'var(--color-complete)' : 'var(--color-incomplete)') : undefined,
        // to handle zero width level names
        minWidth: 10,
      }}
    >
      <span className='truncate'>{level.name}</span>
      {isSolved && <Solved className='-mr-1' />}

    </Link>
    <StyledTooltip id={tooltipId} />
  </>);
}
