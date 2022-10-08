import React from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import SquareState from '../../models/squareState';
import { GameState } from './game';
import Square from './square';

interface GridProps {
  board: SquareState[][];
  borderWidth: number;
  gameState: GameState;
  leastMoves: number;
  onCellClick: (x: number, y: number) => void;
  squareSize: number;
}

export default function Grid({ board, borderWidth, gameState, leastMoves, onCellClick, squareSize }: GridProps) {
  const classic = document.body.classList.contains(Theme.Classic);
  const grid = [];

  for (let y = 0; y < gameState.height; y++) {
    for (let x = 0; x < gameState.width; x++) {
      const levelDataType = board[y][x].levelDataType;
      const text = levelDataType === LevelDataType.End ? leastMoves :
        board[y][x].text.length === 0 ? undefined :
          board[y][x].text[board[y][x].text.length - 1];

      grid.push(
        <div
          key={`grid-${x}-${y}`}
          style={{
            left: squareSize * x + (!classic ? borderWidth : LevelDataType.isRaised(levelDataType) ? 2 * borderWidth : 0),
            position: 'absolute',
            top: squareSize * y + (!classic ? borderWidth : LevelDataType.isRaised(levelDataType) ? 0 : 2 * borderWidth),
          }}
        >
          <Square
            borderWidth={borderWidth}
            key={`grid-square-${x}-${y}`}
            leastMoves={leastMoves}
            levelDataType={levelDataType}
            onClick={(rightClick: boolean) => {
              if (!rightClick) {
                onCellClick(x, y);
              }
            }}
            size={squareSize}
            text={text}
          />
        </div>
      );
    }
  }

  return (
    <>
      {grid}
    </>
  );
}
