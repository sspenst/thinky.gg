import { createContext } from 'react';

interface GridContextInterface {
  borderWidth: number;
  hideText: boolean | undefined;
  innerTileSize: number;
  leastMoves: number;
  tileSize: number;
}

export const GridContext = createContext<GridContextInterface>({
  borderWidth: 0,
  hideText: undefined,
  innerTileSize: 0,
  leastMoves: 0,
  tileSize: 0,
});
