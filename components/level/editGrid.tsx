import Level from '../../models/db/level';
import React from 'react';
import Square from './square';

interface EditGridProps {
  borderWidth: number;
  level: Level;
  squareSize: number;
}

export default function EditGrid({ borderWidth, level, squareSize }: EditGridProps) {
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
        size={squareSize}
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
