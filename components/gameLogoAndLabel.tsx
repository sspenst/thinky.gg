import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import React from 'react';
import GameLogo from './gameLogo';

interface GameLogoAndLabelPropbs {
  gameId: GameId;
  id: string;
  useAbsoluteUrl?: boolean;
  size?: number;
}

export default function GameLogoAndLabel({ gameId, id, useAbsoluteUrl, size = 36 }: GameLogoAndLabelPropbs) {
  return (<>
    <GameLogo useAbsoluteUrl={useAbsoluteUrl} gameId={gameId} id={id} size={size} />
    {getGameFromId(gameId).displayName}
  </>);
}
