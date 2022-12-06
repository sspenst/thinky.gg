import React, { useCallback } from 'react';
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

  const getGrid = useCallback(() => {
    console.log(level.data, level.data.split('\n'), level.data.split(/\n/));

    const data = level.data.split(/\n/);
    const grid = [];

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const levelDataType = data[y].charAt(x);

        grid.push(
          <div
            className='absolute'
            key={`editor-square-${x}-${y}`}
            style={{
              left: squareSize * x + (!classic ? borderWidth : LevelDataType.isRaised(levelDataType) ? 2 * borderWidth : 0),
              top: squareSize * y + (!classic ? borderWidth : LevelDataType.isRaised(levelDataType) ? 0 : 2 * borderWidth),
            }}
          >
            <Square
              borderWidth={borderWidth}
              leastMoves={level.leastMoves}
              levelDataType={levelDataType}
              onClick={(rightClick: boolean) => onClick ? onClick(y * (level.width + 1) + x, rightClick) : undefined}
              size={squareSize}
              text={levelDataType === LevelDataType.Start ? 0 :
                levelDataType === LevelDataType.End ? level.leastMoves : undefined}
            />
          </div>
        );
      }
    }

    return grid;
  }, [borderWidth, classic, level, onClick, squareSize]);

  return (
    <div
      className='relative'
      style={{
        height: squareSize * level.height,
        width: squareSize * level.width,
      }}
    >
      {getGrid()}
    </div>
  );
}
