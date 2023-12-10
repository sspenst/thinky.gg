import StyledTooltip from '@root/components/page/styledTooltip';
import { GameId } from '@root/constants/GameId';
import Image from 'next/image';
import React from 'react';
import getFontFromTheme from './getFont';
import { getGameFromId } from './getGameIdFromReq';

export function getGameLogo(gameId: GameId, id?: string, size: number = 6) {
  if (!id) {
    // gen random
    id = Math.random().toString(36).substring(7);
  }

  const game = getGameFromId(gameId);
  const logo = game.logo;
  const tooltipId = `${game.id}-tip-${id}`;

  return <div data-tooltip-id={tooltipId} data-tooltip-content={game.displayName}>
    <Image alt='logo' src={logo} width={size} height={size} className={`h-${size} w-${size}`} unoptimized style={{
      /* rounded corners */
      borderRadius: '20%',
    }} />
    <StyledTooltip id={tooltipId} />
  </div>;
}

export function getGameLogoAndLabel(game: GameId, id: string, size: number = 12) {
  if (!game) {
    return null;
  }

  return <div className='flex flex-row gap-3 text-lg items-center'>
    <div>
      {getGameLogo(game, id, size)}
    </div>
    <div className={getFontFromTheme(getGameFromId(game))}>{getGameFromId(game).displayName}
    </div>
  </div>;
}
