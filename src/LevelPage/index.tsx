import { useState, useEffect } from 'react';
import React from 'react';
import LevelOptions from '../Models/LevelOptions';
import { To, useSearchParams } from 'react-router-dom';
import Level from '../DataModels/Pathology/Level';
import Game from './Game';
import Page from '../Common/Page';

export default function LevelPage() {
  const [escapeTo, setEscapeTo] = useState<To>();
  const [level, setLevel] = useState<Level>();
  const [levelOptions, setLevelOptions] = useState<LevelOptions>();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState<string>();
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
    
      setEscapeTo(`/pack?id=${level.packId}`);
      setLevelOptions(new LevelOptions(level.author));
      setTitle(level.name);
    }
  
    getLevel();
  }, [levelId]);

  useEffect(() => {
    async function getLevels() {
      // ensure level ids match to avoid making two requests when pressing prev or next
      if (!level || !levelId || levelId !== level._id) {
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
    
      setLevelOptions(new LevelOptions(
        level.author,
        nextLevelId,
        prevLevelId,
      ));
    }
  
    getLevels();
  }, [level, levelId]);

  if (!level) {
    return null;
  }

  return (
    <Page escapeTo={escapeTo} levelOptions={levelOptions} title={title}>
      <Game level={level}/>
    </Page>
  );
}
