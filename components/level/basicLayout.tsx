import { Types } from 'mongoose';
import React from 'react';
import TileType from '../../constants/tileType';
import Control from '../../models/control';
import Level from '../../models/db/level';
import SquareState from '../../models/squareState';
import Controls from './controls';
import Grid from './grid';

interface BasicLayoutProps {
  cellClassName?: (index: number) => string | undefined;
  controls?: Control[];
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
}

export default function BasicLayout({ cellClassName, controls, level, onClick }: BasicLayoutProps) {
  const data = level.data.split('\n');
  const height = level.height;
  const width = level.width;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() =>
      new SquareState()));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      board[y][x].levelDataType = data[y][x] as TileType;

      if (data[y][x] === TileType.Start) {
        board[y][x].text.push(0);
      }
    }
  }

  return (
    <>
      <Grid
        board={board}
        cellClassName={(x, y) => cellClassName ? cellClassName(y * (level.width + 1) + x) : undefined}
        id={(level._id ?? new Types.ObjectId()).toString()}
        leastMoves={level.leastMoves}
        onCellClick={(x, y, rightClick) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
      />
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
