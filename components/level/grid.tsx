import Level from '../../models/db/level';
import LevelDataType from '../../constants/levelDataType';
import React from 'react';
import Square from './square';
import SquareState from '../../models/squareState';

interface GridProps {
  board: SquareState[][];
  borderWidth: number;
  level: Level;
  squareSize: number;
}

export default function Grid({ board, borderWidth, level, squareSize }: GridProps) {
  const grid = [];

  for (let y = 0; y < level.height; y++) {
    const squares = [];

    for (let x = 0; x < level.width; x++) {
      const levelDataType = board[y][x].levelDataType;
      const text = levelDataType === LevelDataType.End ? level.leastMoves :
        board[y][x].text.length === 0 ? undefined :
          board[y][x].text[board[y][x].text.length - 1];

      squares.push(<Square
        borderWidth={borderWidth}
        key={x}
        leastMoves={level.leastMoves}
        levelDataType={levelDataType}
        size={squareSize}
        text={text}
      />);
    }

    grid.push(
      <div key={y} style={{ display: 'flex' }}>
        {squares}
      </div>
    );
  }

  return (
    <>
      {grid}
    </>
  );
}
