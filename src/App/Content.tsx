import { useCallback, useEffect, useState } from 'react';
import React from 'react';
import Nav from '../Nav';
import CreatorSelect from './CreatorSelect';
import GameContainer from './GameContainer';
import LevelSelect from './LevelSelect';
import PackSelect from './PackSelect';
import Control from '../Models/Control';

interface ContentProps {
  height: number;
  setControls: (controls: Control[]) => void;
  width: number;
}

export default function Content(props: ContentProps) {
  const [creatorId, setCreatorId] = useState<string | undefined>(undefined);
  const [creators, setCreators] = useState([]);
  const [levelIndex, setLevelIndex] = useState<number | undefined>(undefined);
  const [levels, setLevels] = useState([]);
  const [packId, setPackId] = useState<string | undefined>(undefined);
  const [packs, setPacks] = useState([]);

  const goToCreatorSelect = useCallback(() => {
    setCreatorId(undefined);
    setPacks([]);
  }, []);
  const goToLevelSelect = useCallback(() => {
    setLevelIndex(undefined);
  }, []);
  const goToNextLevel = useCallback(() => {
    setLevelIndex(levelIndex => {
      if (levelIndex === undefined) {
        return undefined;
      }

      return levelIndex === levels.length - 1 ? undefined : levelIndex + 1;
    });
  }, [levels.length]);
  const goToPackSelect = useCallback(() => {
    setPackId(undefined);
    setLevels([]);
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
      if (!creatorId) {
        return;
      }

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
  }, [creatorId]);

  // fetch levels from the database
  useEffect(() => {
    async function getLevels() {
      if (!packId) {
        return;
      }
      
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
  }, [packId]);

  const nav = !creatorId ? <Nav/> : null;
  const content = levelIndex !== undefined ?
    <GameContainer
      goToLevelSelect={goToLevelSelect}
      goToNextLevel={goToNextLevel}
      height={props.height}
      key={levelIndex}
      level={levels[levelIndex]}
      setControls={props.setControls}
      width={props.width}
    /> :
    packId ?
    <LevelSelect
      goToPackSelect={goToPackSelect}
      levels={levels}
      setControls={props.setControls}
      setLevelIndex={setLevelIndex}
    /> :
    creatorId ?
    <PackSelect
      goToCreatorSelect={goToCreatorSelect}
      packs={packs}
      setControls={props.setControls}
      setPackId={setPackId}
    /> :
    <CreatorSelect
      creators={creators}
      setControls={props.setControls}
      setCreatorId={setCreatorId}
    />;

  return (<>
    {nav}
    {content}
  </>);
}
