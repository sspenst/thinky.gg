import TileType from '@root/constants/tileType';
import { BlockState, GameState, TileState } from '@root/helpers/gameStateHelpers';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import React from 'react';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Controls from './controls';
import Grid from './grid';

interface BasicLayoutProps {
  cellClassName?: (index: number) => string | undefined;
  cellStyle?: (index: number) => React.CSSProperties | undefined;
  controls?: Control[];
  hideText?: boolean;
  id: string;
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
}

export default function BasicLayout({ cellClassName, cellStyle, controls, hideText, id, level, onClick }: BasicLayoutProps) {
  const data = level.data.split('\n');
  const height = data.length;
  const width = data[0].length;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() => {
      return {
        block: undefined,
        text: [],
        tileType: TileType.Default,
      } as TileState;
    }));
  let blockId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = data[y][x] as TileType;

      if (tileType === TileType.Wall ||
        tileType === TileType.Exit ||
        tileType === TileType.Hole ||
        tileType === TileType.Player) {
        board[y][x].tileType = tileType;
      } else if (TileTypeHelper.isOnExit(tileType)) {
        board[y][x].tileType = TileType.Exit;
        board[y][x].block = {
          id: blockId++,
          tileType: TileTypeHelper.getExitSibilingTileType(tileType),
        } as BlockState;
      } else if (TileTypeHelper.canMove(tileType)) {
        board[y][x].block = {
          id: blockId++,
          tileType: tileType,
        } as BlockState;
      }
    }
  }

  return (
    <>
      <Grid
        cellClassName={(x, y) => cellClassName ? cellClassName(y * (level.width + 1) + x) : undefined}
        cellStyle={(x, y) => cellStyle ? cellStyle(y * (level.width + 1) + x) : undefined}
        disableAnimation
        gameState={{ board: board } as GameState}
        hideText={hideText}
        id={id}
        leastMoves={level.leastMoves}
        onCellClick={(x, y, rightClick) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
      />
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
