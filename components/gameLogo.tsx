import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StyledTooltip from './page/styledTooltip';

interface GameLogoProps {
  gameId?: GameId;
  id: string;

  size?: number;
  tooltip?: boolean;
  clickable?: boolean;
}

export default function GameLogo({ gameId, id, size = 28, tooltip = false, clickable = false }: GameLogoProps) {
  const router = useRouter();

  if (!gameId) {
    return null;
  }

  const game = getGameFromId(gameId);
  const tooltipId = `${game.id}-tooltip-${id}`;
  const src = game.logo;

  return (<div>
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
      className={clickable ? 'cursor-pointer z-10' : undefined}
      onClick={clickable ? () => {
        // get the game url and visit this same url but with the game id subdomain
        const subdomain = game.subdomain;
        const currentUrl = window.location.href;
        const newUrl = currentUrl.replace(window.location.hostname, `${subdomain}.${window.location.hostname}`);

        router.push(newUrl);
      } : undefined}
    />
    {tooltip && <StyledTooltip id={tooltipId} />}
  </div>);
}
