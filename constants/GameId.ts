export enum GameId {
  THINKY = 'thinky',
  PATHOLOGY = 'pathology',
  PATHOBAN = 'pathoban',
}

export const DEFAULT_GAME_ID = process.env.NODE_ENV !== 'test' ? GameId.THINKY : GameId.PATHOLOGY;
