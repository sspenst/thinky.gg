import levelUtil from '@root/constants/LevelUtil';
import React, { useMemo } from 'react';
import { TileType } from '../../constants/tileType';
import Control from '../../models/control';
import Level from '../../models/db/level';
import SquareState from '../../models/squareState';
import Controls from './controls';
import Grid from './grid';

interface BasicLayoutProps {
  controls?: Control[];
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
}

export default function BasicLayout({ controls, level, onClick }: BasicLayoutProps) {
  const data = level.data.split('\n');
  const height = level.height;
  const width = level.width;
  const board = Array(height).fill(undefined).map(() =>
    new Array(width).fill(undefined).map(() =>
      new SquareState()));
  const grid = useMemo(() => {
    return <Grid
      board={board}
      leastMoves={level.leastMoves}
      onCellClick={(x, y, rightClick) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
    />;
  }, [board, level.leastMoves, level.width, onClick]);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      board[y][x].levelDataType = data[y][x] as TileType;

      if (data[y][x] === levelUtil.Start) {
        board[y][x].text.push(0);
      }
    }
  }

  return (
    <>
      {grid}
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
