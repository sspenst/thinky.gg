import Color from '../../constants/color';
import Level from '../../models/data/pathology/level';
import React from 'react';
import SquareState from '../../models/squareState';
import SquareType from '../../enums/squareType';
import classNames from 'classnames';

interface SquareProps {
  borderWidth: number;
  leastMoves: number;
  size: number;
  squareState: SquareState;
}

function Square({ borderWidth, leastMoves, size, squareState }: SquareProps) {
  function getText() {
    if (squareState.text.length === 0) {
      return undefined;
    }

    return squareState.text[squareState.text.length - 1];
  }

  function getSquareColor() {
    switch (squareState.squareType) {
      case SquareType.Wall:
        return 'bg-neutral-800';
      case SquareType.End:
        return 'bg-neutral-200';
      default:
        return getText() !== undefined ? 'bg-emerald-700' : 'bg-emerald-500';
    }
  }

  const innerSize = size - 2 * borderWidth;
  const text = getText();
  const fontSizeRatio = text === undefined || String(text).length <= 3 ?
    2 : (1 + (String(text).length - 1) / 2);
  const fontSize = innerSize / fontSizeRatio;
  const textColor = text !== undefined && text > leastMoves ? 'rgb(255 60 60)' : 'black';

  return (
    <div
      className={classNames('cursor-default select-none', getSquareColor())}
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
      {squareState.squareType === SquareType.Hole ?
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
        text
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
        squareState={board[y][x]}
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
