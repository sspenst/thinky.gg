import React from 'react';
import LevelDataType from '../../constants/levelDataType';
import Level from '../../models/db/level';
import Square from './square';

interface EditorGridProps {
  borderWidth: number;
  level: Level;
  onClick?: (index: number, clear: boolean) => void;
  squareSize: number;
}

export default function EditorGrid({ borderWidth, level, onClick, squareSize }: EditorGridProps) {
  const data = level.data.split('\n');
  const grid = [];

  for (let y = 0; y < level.height; y++) {
    const squares = [];

    for (let x = 0; x < level.width; x++) {
      squares.push(<Square
        borderWidth={borderWidth}
        key={`editor-square-${x}-${y}`}
        leastMoves={level.leastMoves}
        levelDataType={data[y][x]}
        onClick={(clear: boolean) => onClick ? onClick(y * (level.width + 1) + x, clear) : undefined}
        size={squareSize}
        text={data[y][x] === LevelDataType.Start ? 0 :
          data[y][x] === LevelDataType.End ? level.leastMoves : undefined}
      />);
    }

    grid.push(
      <div key={`editor-row-${y}`} style={{ display: 'flex' }}>
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
