import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Dimensions from '../Constants/Dimensions';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';

export default function App() {
  const [colors, setColors] = useState<string[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

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
    
    getCreators();
  }, []);

  useEffect(() => {
    async function getLeastMoves() {
      if (creators.length === 0) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + 'levels/allleastmoves');

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
      
      setColors(LeastMovesHelper.creatorColors(creators, await response.json()));
    }

    getLeastMoves();
  }, [creators]);

  const menuOptions = new MenuOptions('PATHOLOGY');
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
    {creators.length > 0 ?
      <Select
        colors={colors}
        height={height - Dimensions.MenuHeight}
        ids={creators.map(creator => creator._id)}
        options={creators.map(creator => <span>{creator.name}</span>)}
        pathname={'creator'}
        width={width}
      />
    : null}
  </>);
}
