import { useState, useEffect } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Creator from '../DataModels/Pathology/Creator';
import Pack from '../DataModels/Pathology/Pack';
import Menu from '../Common/Menu';
import Select from '../Common/Select';
import useWindowSize from '../Common/useWindowSize';
import Dimensions from '../Constants/Dimensions';

export default function CreatorPage() {
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchParams] = useSearchParams();
  const creatorId = searchParams.get('id');

  useEffect(() => {
    async function getCreator() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `creators?id=${creatorId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators: Creator[] = await response.json();
      const creator = creators[0];

      setMenuOptions(new MenuOptions(
        creator.name,
        undefined,
        undefined,
        '',
      ));
    }

    async function getPacks() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `packs?creatorId=${creatorId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setPacks(packs);
    }

    if (!creatorId) {
      return;
    }
  
    getCreator();
    getPacks();
  }, [creatorId]);

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
      ids={packs.map(pack => pack._id)}
      options={packs.map(pack => <span>{pack.name}</span>)}
      pathname={'pack'}
      width={width}
    />
  </>);
}
