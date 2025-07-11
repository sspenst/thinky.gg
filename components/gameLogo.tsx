import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Image from 'next/image';
import StyledTooltip from './page/styledTooltip';

interface GameLogoProps {
  gameId?: GameId;
  id: string;

  size?: number;
  tooltip?: boolean;
}

export default function GameLogo({ gameId, id, size = 28, tooltip = false }: GameLogoProps) {
  if (!gameId) {
    return null;
  }

  const game = getGameFromId(gameId);
  const tooltipId = `${game.id}-tooltip-${id}`;
  const src = game.logo;

  return (<>
    <Image
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
