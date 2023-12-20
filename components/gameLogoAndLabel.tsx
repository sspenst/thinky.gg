import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import React from 'react';
import GameLogo from './gameLogo';

interface GameLogoAndLabelPropbs {
  gameId: GameId;
  id: string;
  className?: string;
  size?: number;
}

export default function GameLogoAndLabel({ gameId, id, className, size = 36 }: GameLogoAndLabelPropbs) {
  return (
    <div className={'flex gap-4 items-center ' + className}>
      <GameLogo gameId={gameId} id={id} size={size} />
      {getGameFromId(gameId).displayName}
    </div>
  );
}
