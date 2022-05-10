import Level from '../../models/db/level';
import LevelDataType from '../../constants/levelDataType';
import React from 'react';
import Square from './square';

interface EditGridProps {
  borderWidth: number;
  level: Level;
  onClick: (index: number) => void;
  squareSize: number;
}

export default function EditGrid({ borderWidth, level, onClick, squareSize }: EditGridProps) {
  const data = level.data.split('\n');
  const grid = [];

  for (let y = 0; y < level.height; y++) {
    const squares = [];

    for (let x = 0; x < level.width; x++) {
      squares.push(<Square
        borderWidth={borderWidth}
        key={x}
        leastMoves={level.leastMoves}
        levelDataType={data[y][x]}
        onClick={() => onClick(y * (level.width + 1) + x)}
        size={squareSize}
        text={data[y][x] === LevelDataType.Start ? 0 :
          data[y][x] === LevelDataType.End ? level.leastMoves : undefined}
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
