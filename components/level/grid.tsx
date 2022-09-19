import React from 'react';
import LevelDataType from '../../constants/levelDataType';
import SquareState from '../../models/squareState';
import { GameState } from './game';
import Square from './square';

interface GridProps {
  board: SquareState[][];
  borderWidth: number;
  gameState: GameState;
  leastMoves: number;
  squareSize: number;
  onCellClick?: (x: number, y: number) => void;
}

export default function Grid({ board, borderWidth, gameState, leastMoves, squareSize, onCellClick }: GridProps) {
  const grid = [];

  for (let y = 0; y < gameState.height; y++) {
    const squares = [];

    for (let x = 0; x < gameState.width; x++) {
      const levelDataType = board[y][x].levelDataType;
      const text = levelDataType === LevelDataType.End ? leastMoves :
        board[y][x].text.length === 0 ? undefined :
          board[y][x].text[board[y][x].text.length - 1];

      squares.push(<Square
        borderWidth={borderWidth}
        key={`grid-square-${x}-${y}`}
        leastMoves={leastMoves}
        levelDataType={levelDataType}
        size={squareSize}
        text={text}
        onClick={(rightClick) => {
          if (!rightClick && onCellClick) {
            onCellClick(x, y);
          }
        }}
      />);
    }

    grid.push(
      <div className='flex' key={`grid-row-${y}`}>
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
