import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/router';
import Level from '../../models/data/pathology/level';
import LevelOptions from '../../models/levelOptions';
import Game from '../../components/level/game';
import Page from '../../components/page';

export default function LevelPage() {
  const [escapeHref, setEscapeHref] = useState<string>();
  const [level, setLevel] = useState<Level>();
  const [levelOptions, setLevelOptions] = useState<LevelOptions>();
  const router = useRouter();
  const [title, setTitle] = useState<string>();
  const { id } = router.query;

  useEffect(() => {
    async function getLevel() {
      if (!id) {
        return;
      }

      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?id=${id}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels: Level[] = await response.json();
      const level = levels[0];

      setLevel(level);
    
      setEscapeHref(`/pack?id=${level.packId}`);
      setLevelOptions(new LevelOptions(level.author));
      setTitle(level.name);
    }
  
    getLevel();
  }, [id]);

  useEffect(() => {
    async function getLevels() {
      // ensure level ids match to avoid making two requests when pressing prev or next
      if (!level || !id || id !== level._id) {
        return;
      }
  
      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?packId=${level.packId}`);
  
      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }
  
      const levels: Level[] = await response.json();
      const levelIds = levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
        .map(level => level._id);

      const levelIdIndex = levelIds.indexOf(id);

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
  }, [level, id]);

  if (!level) {
    return null;
  }

  return (
    <Page needsAuth={true} escapeHref={escapeHref} levelOptions={levelOptions} title={title}>
      <Game level={level}/>
    </Page>
  );
}
