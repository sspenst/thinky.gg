import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Image from 'next/image';
import React from 'react';
import StyledTooltip from './page/styledTooltip';

interface GameLogoProps {
  gameId: GameId;
  id: string;
  useAbsoluteUrl?: boolean;
  size?: number;
  tooltip?: boolean;
}

export default function GameLogo({ gameId, id, useAbsoluteUrl, size = 28, tooltip = false }: GameLogoProps) {
  const game = getGameFromId(gameId);
  const tooltipId = `${game.id}-tooltip-${id}`;
  const src = !useAbsoluteUrl ? game.logo : game.baseUrl + game.logo;

  return (<>
    <Image
      className='rounded'
      alt={`logo-${game.displayName}`}
      data-tooltip-content={game.displayName}
      data-tooltip-id={tooltipId}
      height={size}
      src={src}
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
