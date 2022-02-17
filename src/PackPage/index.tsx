import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Pack from '../DataModels/Pathology/Pack';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Level from '../DataModels/Pathology/Level';
import Dimensions from '../Constants/Dimensions';
import LocalStorage from '../Models/LocalStorage';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';

function getMoveText(level: Level) {
  const leastMoves = level.leastMoves;
  const moves = LocalStorage.getLevelMoves(level._id);

  return `${moves === null ? '' : moves}/${leastMoves}`;
}

export default function PackPage() {
  const [colors, setColors] = useState<string[]>([]);
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
        'creator',
        pack.creatorId,
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
      setColors(LeastMovesHelper.levelColors(levels));
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
    <Menu
      menuOptions={menuOptions}
      width={width}
    />
    {levels.length > 0 ?
      <Select
        colors={colors}
        height={height - Dimensions.MenuHeight}
        ids={levels.map(level => level._id)}
        optionHeight={120}
        options={levels.map(level =>
          <span>
            {level.name}
            <br/>
            <span className='italic'>{level.author}</span>
            <br/>
            {getMoveText(level)}
          </span>
        )}
        pathname={'level'}
        width={width}
      />
    : null}
  </>);
}
