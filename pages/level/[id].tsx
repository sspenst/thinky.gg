import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import LevelOptions from '../../models/levelOptions';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface LevelParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  const { id } = context.params as LevelParams;
  const res = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?id=${id}`);

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const level = (await res.json())[0];
  const levelsRes = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?packId=${level.packId}`);

  if (!levelsRes.ok) {
    throw new Error(`${levelsRes.status} ${levelsRes.statusText}`);
  }

  const levels: Level[] = await levelsRes.json();
  const levelIds = levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
    .map(level => level._id);
  const levelIdIndex = levelIds.indexOf(id);

  if (levelIdIndex === -1) {
    throw new Error(`Level ${id} not found in pack ${level.packId}`);
  }

  const nextLevelId = levelIdIndex !== levelIds.length - 1 ?
    levelIds[levelIdIndex + 1] : undefined;
  const prevLevelId = levelIdIndex !== 0 ?
    levelIds[levelIdIndex - 1] : undefined;
  const levelOptions = new LevelOptions(nextLevelId, prevLevelId);

  return {
    props: {
      level,
      levelOptions,
    } as LevelPageProps
  };
}

interface LevelPageProps {
  level: Level;
  levelOptions: LevelOptions;
}

export default function LevelPage({ level, levelOptions }: LevelPageProps) {
  return (!level ? null :
    <Page
      escapeHref={`/pack/${level.packId}`}
      levelOptions={levelOptions}
      subtitle={level.author}
      title={level.name}
    >
      <Game key={level._id} level={level}/>
    </Page>
  );
}
