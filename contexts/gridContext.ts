import { createContext } from 'react';

interface GridContextInterface {
  borderWidth: number;
  innerTileSize: number;
  tileSize: number;
}

export const GridContext = createContext<GridContextInterface>({
  borderWidth: 0,
  innerTileSize: 0,
  tileSize: 0,
});
