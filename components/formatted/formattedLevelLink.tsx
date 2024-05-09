import Dimensions from '@root/constants/dimensions';
import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import getLevelCompleteColor from '@root/helpers/getLevelCompleteColor';
import useUrl from '@root/hooks/useUrl';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnrichedLevel } from '../../models/db/level';
import Solved from '../level/info/solved';
import StyledTooltip from '../page/styledTooltip';

interface EnrichedLevelLinkProps {
  gameId?: GameId;
  // NB: this id should not contain the level id
  id: string;
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function FormattedLevelLink({ gameId, id, level, onClick }: EnrichedLevelLinkProps) {
  const { game } = useContext(AppContext);
  const getUrl = useUrl();
  const href = getUrl(gameId || game.id, `/level/${level.slug}`);
  const isSolved = level.userMoves === level.leastMoves;
  const tooltipId = `formatted-level-link-${level._id.toString()}-${id}`;

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
      href={href}
      onClick={onClick}
      passHref
      prefetch={false}
      style={{
        color: getLevelCompleteColor(level, game.id),
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
