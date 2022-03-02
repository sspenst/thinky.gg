import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Dimensions from '../Constants/Dimensions';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';
import SelectOption from '../Models/SelectOption';
import SelectOptionStats from '../Models/SelectOptionStats';
import { WindowSizeContext } from '../Common/WindowSizeContext';

export default function Catalog() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);

  useEffect(() => {
    async function getCreators() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + 'creators');

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators: Creator[] = await response.json();
      creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setCreators(creators);
    }

    async function getMoves() {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }
    
    getCreators();
    getMoves();
  }, []);

  useEffect(() => {
    async function getLeastMoves() {
      if (creators.length === 0 || !moves) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + 'levels/allleastmoves');

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
      
      setStats(LeastMovesHelper.creatorStats(creators, await response.json(), moves));
    }

    getLeastMoves();
  }, [creators, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      options.push(new SelectOption(
        creator._id,
        stats.length === 0 ? undefined : stats[i],
        undefined,
        creator.name,
      ));
    }
    
    return options;
  }, [creators, stats]);

  const windowSize = useWindowSize();
  
  if (!windowSize) {
    return null;
  }

  return (
    <WindowSizeContext.Provider value={windowSize}>
      <Menu
        menuOptions={new MenuOptions('Catalog', '')}
      />
      {creators.length > 0 ?
        <Select
          options={getOptions()}
          pathname={'creator'}
          top={Dimensions.MenuHeight}
        />
      : null}
    </WindowSizeContext.Provider>
  );
}
