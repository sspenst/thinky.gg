import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Menu from '../Common/Menu';
import useWindowSize from '../Common/useWindowSize';
import Level from '../DataModels/Pathology/Level';
import GameContainer from './GameContainer';
import Dimensions from '../Constants/Dimensions';

export default function LevelPage() {
  const [level, setLevel] = useState<Level>();
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [searchParams] = useSearchParams();
  const levelId = searchParams.get('id');

  useEffect(() => {
    async function getLevel() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?id=${levelId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels: Level[] = await response.json();
      const level = levels[0];

      setLevel(level);
    
      setMenuOptions(new MenuOptions(
        level.name,
        level.author,
        level.packId,
        'pack',
      ));
    }
  
    getLevel();
  }, [levelId]);

  useEffect(() => {
    async function getLevels() {
      if (!level || !levelId) {
        return;
      }
  
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?packId=${level.packId}`);
  
      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
  
      const levels: Level[] = await response.json();
      const levelIds = levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
        .map(level => level._id);

      const levelIdIndex = levelIds.indexOf(levelId);

      if (levelIdIndex === -1) {
        return;
      }

      let nextLevelId = undefined;
      let prevLevelId = undefined;

      if (levelIdIndex !== levelIds.length - 1) {
        nextLevelId = levelIds[levelIdIndex + 1];
      }

      if (levelIdIndex !== 0) {
        prevLevelId = levelIds[levelIdIndex - 1];
      }
    
      setMenuOptions(new MenuOptions(
        level.name,
        level.author,
        level.packId,
        'pack',
        nextLevelId,
        prevLevelId,
      ));
    }
  
    getLevels();
  }, [level, levelId]);

  const windowSize = useWindowSize();
  let height = windowSize.height;
  let width = windowSize.width;

  if (!level || !height || !width) {
    return null;
  }

  const gameHeight = height - Dimensions.ControlsHeight - Dimensions.MenuHeight;
  const goToLevelSelect = () => console.log('gtls');

  return (<>
    <div style={{
      position: 'fixed',
      top: 0,
      height: Dimensions.MenuHeight,
      width: width,
    }}>
      <Menu
        menuOptions={menuOptions}
      />
    </div>
    <GameContainer
      goToLevelSelect={goToLevelSelect}
      height={gameHeight}
      key={level._id}
      level={level}
      width={width}
    />
  </>);
}
