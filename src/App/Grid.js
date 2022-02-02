import Color from './Color';
import SquareType from './SquareType';

function Square(props) {
  function getSquareColor() {
    switch (props.square) {
      case SquareType.Wall:
        return 'bg-neutral-800';
      case SquareType.End:
        return 'bg-neutral-200';
      default:
        return props.text !== undefined ? 'bg-emerald-700' : 'bg-emerald-500';
    }
  }

  const borderWidth = props.size * 0.03;
  const squareColor = getSquareColor();
  const fontSize = props.size * 0.5;
  const textColor = props.text > props.leastMoves ? Color.TextMoveOver : Color.TextMove;

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
      {props.text}
    </div>
  );
}

function Row(props) {
  return (
    <div style={{display: 'flex'}}>
      {props.squares}
    </div>
  );
}

export default function Grid(props) {
  const grid = [];

  for (let y = 0; y < props.dimensions.y; y++) {
    const squares = [];

    for (let x = 0; x < props.dimensions.x; x++) {
      squares.push(<Square
        key={x}
        leastMoves={props.leastMoves}
        size={props.squareSize}
        square={props.board[y][x]}
        text={props.text[y][x]}
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
