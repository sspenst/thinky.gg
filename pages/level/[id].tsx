import { useState, useEffect } from 'react';
import React from 'react';
import { useRouter } from 'next/router';
import Level from '../../models/data/pathology/level';
import LevelOptions from '../../models/levelOptions';
import Game from '../../components/level/game';
import Page from '../../components/page';
import { GetServerSidePropsContext } from 'next';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id } = context.query;
  const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?id=${id}`);

  if (!response.ok) {
    const message = `An error occurred: ${response.statusText}`;
    console.error(message);
    return;
  }

  const levels: Level[] = await response.json();
  const level = levels[0];

  return {
    props: {
      level,
    } as LevelPageProps
  };
}

interface LevelPageProps {
  level: Level;
}

export default function LevelPage({ level }: LevelPageProps) {
  const [levelOptions, setLevelOptions] = useState<LevelOptions>();
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    async function getLevels() {
      if (typeof id !== 'string') {
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
        nextLevelId,
        prevLevelId,
      ));
    }
  
    getLevels();
  }, [level, id]);

  return (
    <Page
      escapeHref={`/pack/${level.packId}`}
      levelOptions={levelOptions}
      subtitle={level.author}
      title={level.name}
    >
      <Game level={level}/>
    </Page>
  );
}
