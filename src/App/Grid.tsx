import React from 'react';
import Color from '../Constants/Color';
import Level from '../Models/Level';
import SquareState from '../Models/SquareState';
import SquareType from './Enums/SquareType';

interface GridProps {
  board: SquareState[][];
  level: Level;
  squareSize: number;
}

interface SquareProps {
  leastMoves: number;
  size: number;
  square: SquareState;
}

interface RowProps {
  squares: any[];
}

function Square(props: SquareProps) {
  function getSquareText() {
    if (props.square.text.length === 0) {
      return undefined;
    }

    return props.square.text[props.square.text.length - 1];
  }

  function getSquareColor() {
    switch (props.square.squareType) {
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

  const borderWidth = props.square.squareType === SquareType.Hole ? props.size * 0.2 : props.size * 0.03;
  const fontSize = props.size * 0.5;
  const squareColor = getSquareColor();
  const squareText = getSquareText();
  const textColor = squareText !== undefined && squareText > props.leastMoves ? Color.TextMoveOver : Color.TextMove;

  return (
    <div
      style={{
        width: props.size,
        height: props.size,
        borderWidth: borderWidth,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: props.size - 2 * borderWidth + 'px',
        fontSize: fontSize,
        color: textColor,
      }}
      className={`font-semibold cursor-default select-none border-neutral-800 ` + squareColor}
    >
      {squareText}
    </div>
  );
}

function Row(props: RowProps) {
  return (
    <div style={{display: 'flex'}}>
      {props.squares}
    </div>
  );
}

export default function Grid(props: GridProps) {
  const grid = [];

  // error check for going to the next level
  if (props.level.height > props.board.length ||
    props.level.width > props.board[0].length) {
    return null;
  }

  for (let y = 0; y < props.level.height; y++) {
    const squares = [];

    for (let x = 0; x < props.level.width; x++) {
      squares.push(<Square
        key={x}
        leastMoves={props.level.leastMoves}
        size={props.squareSize}
        square={props.board[y][x]}
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
