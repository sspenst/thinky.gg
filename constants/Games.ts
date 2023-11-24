import { GameId } from './GameId';

export enum GameType {
  SHORTEST_PATH = 'SHORTEST_PATH',
  NONE = 'NONE'

}
export const Games: Record<GameId, Game> = {
  [GameId.GLOBAL]: {
    id: GameId.GLOBAL,
    displayName: 'Global',
    type: GameType.NONE,
  },
  [GameId.PATHOLOGY]: {
    id: GameId.PATHOLOGY,
    displayName: 'Pathology',
    type: GameType.SHORTEST_PATH,
  },
};
export interface Game {
  id: GameId;
  displayName: string;
  type: GameType;
}
