import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import GameLogo from './gameLogo';

interface GameLogoAndLabelPropbs {
  gameId: GameId;
  id: string;
  size?: number;
}

export default function GameLogoAndLabel({ gameId, id, size = 36 }: GameLogoAndLabelPropbs) {
  return (<>
    <GameLogo gameId={gameId} id={id} size={size} />
    {getGameFromId(gameId).displayName}
  </>);
}
