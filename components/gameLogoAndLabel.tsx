import { GameId } from '@root/constants/GameId';
import getFontFromTheme from '@root/helpers/getFont';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import React from 'react';
import GameLogo from './gameLogo';

interface GameLogoAndLabelPropbs {
  gameId: GameId;
  id: string;
  className?: string;
  size?: number;
}

export default function GameLogoAndLabel({ gameId, id, className, size = 48 }: GameLogoAndLabelPropbs) {
  return (
    <div className={'flex flex-row gap-2 items-center ' + className}>
      <GameLogo gameId={gameId} id={id} size={size} />
      <div className={getFontFromTheme(getGameFromId(gameId))}>
        {getGameFromId(gameId).displayName}
      </div>
    </div>
  );
}
