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
  useAbsoluteUrl?: boolean;
}

export default function GameLogo({ gameId, id, size = 24, useAbsoluteUrl = false, tooltip = false }: GameLogoProps) {
  const game = getGameFromId(gameId);
  const tooltipId = `${game.id}-tooltip-${id}`;
  const url = !useAbsoluteUrl ? game.logo : game.baseUrl + game.logo;

  return (<>
    <Image
      alt={`logo-${game.displayName}`}
      data-tooltip-content={game.displayName}
      data-tooltip-id={tooltipId}
      height={size}
      src={url}
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
