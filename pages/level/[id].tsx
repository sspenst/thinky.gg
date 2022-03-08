import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import LevelOptions from '../../models/levelOptions';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import dbConnect from '../../lib/dbConnect';

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
  await dbConnect();

  const { id } = context.params as LevelParams;
  const level = await LevelModel.findById<Level>(id);

  if (!level) {
    throw new Error(`Error finding Level ${id}`);
  }

  const levels = await LevelModel.find<Level>({ packId: level.packId }, '_id name');

  if (!levels) {
    throw new Error(`Error finding Level by packId ${level.packId})`);
  }

  const levelIds = levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)
    .map(level => level._id.toString());
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
      level: JSON.parse(JSON.stringify(level)),
      levelOptions: JSON.parse(JSON.stringify(levelOptions)),
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
      <Game key={level._id.toString()} level={level}/>
    </Page>
  );
}
