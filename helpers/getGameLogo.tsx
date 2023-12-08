import StyledTooltip from '@root/components/page/styledTooltip';
import { GameId } from '@root/constants/GameId';
import Image from 'next/image';
import React from 'react';
import { getGameFromId } from './getGameIdFromReq';

export function getGameLogo(gameId: GameId, id: string) {
  const game = getGameFromId(gameId);
  const logo = game.logo;
  const tooltipId = `${game.id}-tip-${id}`;

  return <div data-tooltip-id={tooltipId} data-tooltip-content={game.displayName}>
    <Image alt='logo' src={logo} width='24' height='24' className='h-6 w-6' />
    <StyledTooltip id={tooltipId} />
  </div>;
}

export function getGameLogoAndLabel(game: GameId, id: string) {
  if (!game) {
    return null;
  }

  return <div className='flex flex-row gap-1 items-center'>
    <div>
      {getGameLogo(game, id)}
    </div>
    <div>{getGameFromId(game).displayName}
    </div>
  </div>;
}
