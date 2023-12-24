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
  controls?: Control[];
  id: string;
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
}

export default function BasicLayout({ cellClassName, controls, id, level, onClick }: BasicLayoutProps) {
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
        tileType === TileType.End ||
        tileType === TileType.Hole ||
        tileType === TileType.Start) {
        board[y][x].tileType = tileType;
      } else if (tileType === TileType.BlockOnExit) {
        board[y][x].tileType = TileType.End;
        board[y][x].block = {
          id: blockId++,
          tileType: TileType.Block,
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
        disableAnimation
        gameState={{ board: board } as GameState}
        id={id}
        leastMoves={level.leastMoves}
        onCellClick={(x, y, rightClick) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
      />
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
