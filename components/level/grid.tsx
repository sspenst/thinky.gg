import Color from '../../constants/color';
import Level from '../../models/data/pathology/level';
import React from 'react';
import SquareState from '../../models/squareState';
import SquareType from '../../enums/squareType';

interface SquareProps {
  borderWidth: number;
  leastMoves: number;
  size: number;
  square: SquareState;
}

function Square({ borderWidth, leastMoves, size, square }: SquareProps) {
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

  const innerSize = size - 2 * borderWidth;
  const squareText = getSquareText();
  const fontSize = squareText !== undefined && squareText >= 1000 ? innerSize / 3 : innerSize / 2;
  const textColor = squareText !== undefined && squareText > leastMoves ? Color.TextMoveOver : Color.TextMove;

  return (
    <div
      className={`cursor-default select-none ${getSquareColor()}`}
      style={{
        borderColor: Color.Background,
        borderWidth: borderWidth,
        color: textColor,
        fontSize: fontSize,
        height: size,
        lineHeight: innerSize + 'px',
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
            height: innerSize,
            width: innerSize,
          }}
        >
        </div> :
        squareText
      }
    </div>
  );
}

interface GridProps {
  board: SquareState[][];
  borderWidth: number;
  level: Level;
  squareSize: number;
}

export default function Grid({ board, borderWidth, level, squareSize }: GridProps) {
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
        borderWidth={borderWidth}
        key={x}
        leastMoves={level.leastMoves}
        size={squareSize}
        square={board[y][x]}
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
