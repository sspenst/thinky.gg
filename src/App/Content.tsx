import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import Nav from '../Nav';
import CreatorSelect from './CreatorSelect';
import GameContainer from './GameContainer';
import LevelSelect from './LevelSelect';
import PackSelect from './PackSelect';
import Control from '../Models/Control';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';
import Pack from '../DataModels/Pathology/Pack';
import Level from '../DataModels/Pathology/Level';

interface ContentProps {
  height: number;
  setControls: (controls: Control[]) => void;
  setMenuOptions: (menuOptions: MenuOptions) => void;
  top: number;
  width: number;
}

export default function Content(props: ContentProps) {
  const [creatorIndex, setCreatorIndex] = useState<number | undefined>(undefined);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [levelIndex, setLevelIndex] = useState<number | undefined>(undefined);
  const [levels, setLevels] = useState<Level[]>([]);
  const [packIndex, setPackIndex] = useState<number | undefined>(undefined);
  const [packs, setPacks] = useState<Pack[]>([]);

  const goToCreatorSelect = useCallback(() => {
    setCreatorIndex(undefined);
    setPacks([]);
  }, []);
  const goToLevelSelect = useCallback(() => {
    setLevelIndex(undefined);
  }, []);
  const goToNextLevel = useCallback(() => {
    setLevelIndex(levelIndex => {
      return levelIndex === undefined ? undefined :
        levelIndex === levels.length - 1 ? undefined : levelIndex + 1;
    });
  }, [levels.length]);
  const goToPackSelect = useCallback(() => {
    setPackIndex(undefined);
    setLevels([]);
  }, []);
  const goToPrevLevel = useCallback(() => {
    setLevelIndex(levelIndex => {
      return levelIndex === undefined ? undefined :
        levelIndex === 0 ? undefined : levelIndex - 1;
    });
  }, []);
  const sortByName = (a: any, b: any) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;

  // fetch creators from the database
  useEffect(() => {
    async function getCreators() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `creators`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators = await response.json();
      creators.sort(sortByName);
      setCreators(creators);
    }
  
    getCreators();
  
    return;
  }, [creators.length]);

  // fetch packs from the database
  useEffect(() => {
    async function getPacks() {
      if (creatorIndex === undefined) {
        return;
      }

      const creatorId = creators[creatorIndex]._id;
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `packs/${creatorId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs = await response.json();
      packs.sort(sortByName);
      setPacks(packs);
    }
  
    getPacks();
  
    return;
  }, [creatorIndex, creators]);

  // fetch levels from the database
  useEffect(() => {
    async function getLevels() {
      if (packIndex === undefined) {
        return;
      }

      const packId = packs[packIndex]._id;      
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels/${packId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels = await response.json();
      levels.sort(sortByName);
      setLevels(levels);
    }
  
    getLevels();
  
    return;
  }, [packIndex, packs]);

  const nav = creatorIndex === undefined ? <Nav/> : null;
  const content = levelIndex !== undefined ?
    <GameContainer
      goToLevelSelect={goToLevelSelect}
      goToNextLevel={goToNextLevel}
      goToPrevLevel={goToPrevLevel}
      height={props.height}
      key={levelIndex}
      level={levels[levelIndex]}
      setControls={props.setControls}
      setMenuOptions={props.setMenuOptions}
      top={props.top}
      width={props.width}
    /> :
    packIndex !== undefined ?
    <LevelSelect
      goToPackSelect={goToPackSelect}
      levels={levels}
      pack={packs[packIndex]}
      setLevelIndex={setLevelIndex}
      setMenuOptions={props.setMenuOptions}
    /> :
    creatorIndex !== undefined ?
    <PackSelect
      creator={creators[creatorIndex]}
      goToCreatorSelect={goToCreatorSelect}
      packs={packs}
      setMenuOptions={props.setMenuOptions}
      setPackIndex={setPackIndex}
    /> :
    <CreatorSelect
      creators={creators}
      setCreatorIndex={setCreatorIndex}
      setMenuOptions={props.setMenuOptions}
    />;

  return (<>
    {nav}
    {content}
  </>);
}
