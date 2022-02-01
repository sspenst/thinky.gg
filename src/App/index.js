import { useState } from 'react';
import GameContainer from './GameContainer';
import LevelDataType from './LevelDataType';
import Position from './Position';
import SquareType from './SquareType';
import levels from './data/pp1hard.json';
import LevelSelect from './LevelSelect';

export default function App() {
  const [levelIndex, setLevelIndex] = useState(undefined);

  function chooseLevel(levelIndex) {
    setLevelIndex(levelIndex);
  }

  function goToLevelSelect() {
    setLevelIndex(undefined);
  }

  if (levelIndex === undefined) {
    return (
      <LevelSelect
        chooseLevel={chooseLevel}
        levels={levels}
      />
    );
  }

  const level = levels[levelIndex];
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
      goToLevelSelect={goToLevelSelect}
      leastMoves={leastMoves}
      startPos={startPos}
    />
  );
}
