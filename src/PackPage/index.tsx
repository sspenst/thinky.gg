import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Pack from '../DataModels/Pathology/Pack';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Level from '../DataModels/Pathology/Level';
import LevelDataType from '../Constants/LevelDataType';
import Color from '../Constants/Color';
import Dimensions from '../Constants/Dimensions';

function getSymbols(level: Level) {
  let symbols = [];

  if (level.psychopathId) {
    symbols.push(<span key='legacy' style={{color: 'rgb(255, 50, 50)'}}>▲ </span>);
  }

  const data = level.data;
  let block = false;
  let hole = false;
  let restrict = false;

  for (let i = 0; i < data.length; i++) {
    if (data[i] === LevelDataType.Block) {
      block = true;
    } else if (data[i] === LevelDataType.Hole) {
      hole = true;
    } else if (LevelDataType.canMoveRestricted(data[i])) {
      restrict = true;
    }
  }

  if (block) {
    symbols.push(<span key='block' style={{color: Color.Block}}>■ </span>);
  }

  if (hole) {
    symbols.push(<span key='hole' style={{color: 'rgb(16, 185, 129)'}}>● </span>);
  }

  if (restrict) {
    symbols.push(<span key='restrict' style={{color: 'rgb(255, 205, 50)'}}>♦ </span>);
  }

  return symbols;
}

export default function PackPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [searchParams] = useSearchParams();
  const packId = searchParams.get('id');

  useEffect(() => {
    async function getPack() {
      if (!packId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `packs?id=${packId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      const pack = packs[0];

      setMenuOptions(new MenuOptions(
        pack.name,
        undefined,
        pack.creatorId,
        'creator'
      ));
    }

    async function getLevels() {
      if (!packId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?packId=${packId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels: Level[] = await response.json();
      levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setLevels(levels);
    }
  
    getPack();
    getLevels();
  }, [packId]);

  const windowSize = useWindowSize();
  let height = windowSize.height;
  let width = windowSize.width;

  if (!height || !width) {
    return null;
  }

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
    <Select
      height={height - Dimensions.MenuHeight}
      ids={levels.map(level => level._id)}
      options={levels.map(level =>
        <span>
          {level.name}
          <br/>
          {level.author}
          <br/>
          {getSymbols(level)}
        </span>
      )}
      pathname={'level'}
      width={width}
    />
  </>);
}
