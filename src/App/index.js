import { useState } from 'react';
import GameContainer from './GameContainer';
import LevelSelect from './LevelSelect';
import levels from './data/official/pp2easy.json';

export default function App() {
  const [levelIndex, setLevelIndex] = useState(undefined);

  function goToNextLevel() {
    setLevelIndex(levelIndex => {
      return levelIndex === levels.length - 1 ? levelIndex : levelIndex + 1;
    });
  }

  return (
    levelIndex === undefined ?
      <LevelSelect
        levels={levels}
        setLevelIndex={setLevelIndex}
      /> :
      <GameContainer
        goToLevelSelect={() => setLevelIndex(undefined)}
        goToNextLevel={goToNextLevel}
        level={levels[levelIndex]}
      />
  );
}
