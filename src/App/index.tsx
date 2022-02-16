import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Dimensions from '../Constants/Dimensions';

export default function App() {
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

  const [creators, setCreators] = useState<Creator[]>([]);
  const menuOptions = new MenuOptions('PATHOLOGY');
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
      ids={creators.map(creator => creator._id)}
      options={creators.map(creator => <span>{creator.name}</span>)}
      pathname={'creator'}
      width={width}
    />
  </>);
}
