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
  onCellClick: (x: number, y: number) => void;
  squareSize: number;
}

export default function Grid({ board, borderWidth, gameState, leastMoves, onCellClick, squareSize }: GridProps) {
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
        onClick={(rightClick: boolean) => {
          if (!rightClick) {
            onCellClick(x, y);
          }
        }}
        size={squareSize}
        text={text}
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
