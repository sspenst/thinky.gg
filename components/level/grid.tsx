import Color from '../../constants/color';
import Level from '../../models/data/pathology/level';
import React from 'react';
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
        return 'bg-emerald-700';
      default:
        return getSquareText() !== undefined ? 'bg-emerald-700' : 'bg-emerald-500';
    }
  }

  const borderWidth = Math.round(size / 35);
  const squareText = getSquareText();
  const textColor = squareText !== undefined && squareText > leastMoves ? Color.TextMoveOver : Color.TextMove;

  return (
    <div
      className={`cursor-default select-none border-neutral-800 ${getSquareColor()}`}
      style={{
        borderWidth: borderWidth,
        color: textColor,
        fontSize: size / 2,
        height: size,
        lineHeight: size - 2 * borderWidth + 'px',
        textAlign: 'center',
        verticalAlign: 'middle',
        width: size,
      }}
    >
      {square.squareType === SquareType.Hole ?
        <div
          style={{
            backgroundColor: 'rgb(80 80 80)',
            borderColor: Color.BackgroundMenu,
            borderWidth: Math.round(size / 5),
            height: size - 2 * borderWidth,
            width: size - 2 * borderWidth,
          }}
        >
        </div> :
        squareText
      }
    </div>
  );
}

interface RowProps {
  squares: JSX.Element[];
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
