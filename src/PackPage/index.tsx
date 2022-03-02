import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Pack from '../DataModels/Pathology/Pack';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Level from '../DataModels/Pathology/Level';
import Dimensions from '../Constants/Dimensions';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';
import SelectOption from '../Models/SelectOption';
import SelectOptionStats from '../Models/SelectOptionStats';
import { WindowSizeContext } from '../Common/WindowSizeContext';

export default function PackPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);
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
    }

    async function getMoves() {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }

    getPack();
    getLevels();
    getMoves();
  }, [packId]);

  useEffect(() => {
    if (levels.length === 0 || !moves) {
      return;
    }

    setStats(LeastMovesHelper.levelStats(levels, moves));
  }, [levels, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];

      options.push(new SelectOption(
        level._id,
        stats.length === 0 ? undefined : stats[i],
        level.author,
        level.name,
      ));
    }
    
    return options;
  }, [levels, stats]);

  const windowSize = useWindowSize();

  if (!windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={windowSize}>
      <Menu
        menuOptions={menuOptions}
      />
      {levels.length > 0 ?
        <Select
          optionHeight={120}
          options={getOptions()}
          pathname={'level'}
          top={Dimensions.MenuHeight}
        />
      : null}
    </WindowSizeContext.Provider>
  );
}
