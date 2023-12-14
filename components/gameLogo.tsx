import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Image from 'next/image';
import React from 'react';
import StyledTooltip from './page/styledTooltip';

interface GameLogoProps {
  gameId: GameId;
  id: string;
  size?: number;
  tooltip?: boolean;
}

export default function GameLogo({ gameId, id, size = 24, tooltip = false }: GameLogoProps) {
  const game = getGameFromId(gameId);
  const logo = game.logo;
  const tooltipId = `${game.id}-tooltip-${id}`;

  return (<>
    <Image
      alt={`logo-${game.displayName}`}
      data-tooltip-content={game.displayName}
      data-tooltip-id={tooltipId}
      height={size}
      src={logo}
      style={{
        width: size,
        height: size,
      }}
      unoptimized
      width={size}
    />
    {tooltip && <StyledTooltip id={tooltipId} />}
  </>);
}
