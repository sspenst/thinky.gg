import React from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import Level from '../../models/db/level';
import Square from './square';

interface EditorGridProps {
  borderWidth: number;
  level: Level;
  onClick?: (index: number, rightClick: boolean) => void;
  squareSize: number;
}

export default function EditorGrid({ borderWidth, level, onClick, squareSize }: EditorGridProps) {
  const classic = document.body.classList.contains(Theme.Classic);
  const data = level.data.split('\n');
  const grid = [];

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      grid.push(
        <div
          key={`editor-square-${x}-${y}`}
          style={{
            left: squareSize * x + (!classic ? borderWidth : LevelDataType.isRaised(data[y][x]) ? 2 * borderWidth : 0),
            position: 'absolute',
            top: squareSize * y + (!classic ? borderWidth : LevelDataType.isRaised(data[y][x]) ? 0 : 2 * borderWidth),
          }}
        >
          <Square
            borderWidth={borderWidth}
            leastMoves={level.leastMoves}
            levelDataType={data[y][x]}
            onClick={(rightClick: boolean) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
            size={squareSize}
            text={data[y][x] === LevelDataType.Start ? 0 :
              data[y][x] === LevelDataType.End ? level.leastMoves : undefined}
          />
        </div>
      );
    }
  }

  return (
    <div style={{
      height: squareSize * level.height,
      position: 'relative',
      width: squareSize * level.width,
    }}>
      {grid}
    </div>
  );
}
