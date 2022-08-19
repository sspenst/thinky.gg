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
}

export default function Grid({ board, borderWidth, gameState, leastMoves, squareSize }: GridProps) {
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
      />);
    }

    grid.push(
      <div key={`grid-row-${y}`} style={{ display: 'flex' }}>
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
