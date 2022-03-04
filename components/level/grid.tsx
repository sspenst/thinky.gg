import React from 'react';
import Color from '../../constants/color';
import Level from '../../models/data/pathology/level';
import SquareState from '../../models/squareState';
import SquareType from '../../enums/squareType';

interface SquareProps {
  leastMoves: number;
  size: number;
  square: SquareState;
}

function Square({ leastMoves, size, square }: SquareProps) {
  function getSquareText() {
    if (square.text.length === 0) {
      return undefined;
    }

    return square.text[square.text.length - 1];
  }

  function getSquareColor() {
    switch (square.squareType) {
      case SquareType.Wall:
        return 'bg-neutral-800';
      case SquareType.End:
        return 'bg-neutral-200';
      case SquareType.Hole:
        return 'bg-emerald-500';
      default:
        return getSquareText() !== undefined ? 'bg-emerald-700' : 'bg-emerald-500';
    }
  }

  const borderWidth = square.squareType === SquareType.Hole ? size * 0.2 : size * 0.03;
  const fontSize = size * 0.5;
  const squareColor = getSquareColor();
  const squareText = getSquareText();
  const textColor = squareText !== undefined && squareText > leastMoves ? Color.TextMoveOver : Color.TextMove;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderWidth: borderWidth,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: size - 2 * borderWidth + 'px',
        fontSize: fontSize,
        color: textColor,
      }}
      className={'font-semibold cursor-default select-none border-neutral-800 ' + squareColor}
    >
      {squareText}
    </div>
  );
}

interface RowProps {
  squares: any[];
}

function Row({ squares }: RowProps) {
  return (
    <div style={{display: 'flex'}}>
      {squares}
    </div>
  );
}

interface GridProps {
  board: SquareState[][];
  level: Level;
  squareSize: number;
}

export default function Grid({ board, level, squareSize }: GridProps) {
  const grid = [];

  // error check for going to the next level
  if (level.height > board.length ||
    level.width > board[0].length) {
    return null;
  }

  for (let y = 0; y < level.height; y++) {
    const squares = [];

    for (let x = 0; x < level.width; x++) {
      squares.push(<Square
        key={x}
        leastMoves={level.leastMoves}
        size={squareSize}
        square={board[y][x]}
      />);
    }

    grid.push(<Row key={y} squares={squares} />);
  }

  return (
    <>
      {grid}
    </>
  );
}
