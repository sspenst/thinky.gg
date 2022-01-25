import GameContainer from './GameContainer';
import Position from './Position';
import level from '../data/level29.json';

export default function App() {
  // TODO: use level.name and level.author

  const dimensions = new Position(parseInt(level.width), parseInt(level.height));
  const leastMoves = parseInt(level.leastMoves);
  const blocksPos = [];
  const endsPos = [];
  let startPos = undefined;

  // TODO: use typescript so i can an enum for the board values?
  // or a constant class for the values?
  const board = Array(dimensions.y).fill(0).map(() => new Array(dimensions.x).fill(0));

  for (let i = 0; i < level.data.length; i++) {
    const x = i % dimensions.x;
    const y = Math.floor(i / dimensions.x);

    if (level.data[i] === '1') {
      board[y][x] = 1;
    } else if (level.data[i] === '2') {
      blocksPos.push(new Position(x, y));
    } else if (level.data[i] === '3') {
      endsPos.push(new Position(x, y));
      board[y][x] = 4;
    } else if (level.data[i] === '4') {
      startPos = new Position(x, y);
    }
  }

  return (
    <GameContainer
      blocksPos={blocksPos}
      board={board}
      dimensions={dimensions}
      endsPos={endsPos}
      leastMoves={leastMoves}
      startPos={startPos}
    />
  );
}
