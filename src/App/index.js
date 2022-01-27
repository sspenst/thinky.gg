import GameContainer from './GameContainer';
import LevelDataType from './LevelDataType';
import Position from './Position';
import SquareType from './SquareType';
import levels from '../data/PP1/all.json';

export default function App() {
  // TODO: use level.name and level.author
  const level = levels[53];
  const leastMoves = level.leastMoves;
  const dimensions = new Position(level.width, level.height);
  const board = Array(dimensions.y).fill(0).map(() => new Array(dimensions.x).fill(SquareType.Default));
  const blocksPos = [];
  const endsPos = [];
  let startPos = undefined;

  for (let y = 0; y < dimensions.y; y++) {
    for (let x = 0; x < dimensions.x; x++) {
      switch (level.data[y * dimensions.x + x]) {
        case LevelDataType.Wall:
          board[y][x] = SquareType.Wall;
          break;
        case LevelDataType.Block:
          blocksPos.push(new Position(x, y));
          break;
        case LevelDataType.End:
          endsPos.push(new Position(x, y));
          board[y][x] = SquareType.End;
          break;
        case LevelDataType.Start:
          startPos = new Position(x, y);
          break;
        default:
          continue;
      }
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
