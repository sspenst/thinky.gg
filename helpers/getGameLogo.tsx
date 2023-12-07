import StyledTooltip from '@root/components/page/styledTooltip';
import { GameId } from '@root/constants/GameId';
import Image from 'next/image';
import React from 'react';
import { getGameFromId } from './getGameIdFromReq';

export function getGameLogo(gameId: GameId) {
  const game = getGameFromId(gameId);
  const logo = game.logo;
  const random = game.id + '-tip-' + Math.random();

  return <div data-tooltip-id={random} data-tooltip-content={game.displayName}>
    <Image alt='logo' src={logo} width='24' height='24' className='h-6 w-6' />
    <StyledTooltip id={random} />
  </div>;
}

export function getGameLogoAndLabel(game?: GameId) {
  if (!game) {
    return null;
  }

  return <>
    <div>
      {getGameLogo(game)}
    </div>
    <div>{getGameFromId(game).displayName}
    </div>
  </>;
}
