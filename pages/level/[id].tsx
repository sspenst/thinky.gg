import { SWRConfig, unstable_serialize } from 'swr';
import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import LevelOptions from '../../models/levelOptions';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import dbConnect from '../../lib/dbConnect';
import useLevel from '../../components/useLevel';
import { useRouter } from 'next/router';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const levels = await LevelModel.find<Level>();

  if (!levels) {
    throw new Error('Error finding Packs');
  }

  return {
    paths: levels.map(level => {
      return {
        params: {
          id: level._id.toString()
        }
      };
    }),
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
    } as LevelSWRProps
  };
}

interface LevelPageProps {
  levelOptions: LevelOptions;
}

function LevelPage({ levelOptions }: LevelPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { level } = useLevel(id);

  return (!level ? null :
    <Page
      escapeHref={`/pack/${level.packId}`}
      hideUserInfo={true}
      levelOptions={levelOptions}
      subtitle={level.author}
      title={level.name}
    >
      <Game key={level._id.toString()} level={level}/>
    </Page>
  );
}

interface LevelSWRProps {
  level: Level;
  levelOptions: LevelOptions;
}

export default function LevelSWR({ level, levelOptions }: LevelSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [unstable_serialize(`/api/level/${id}`)]: level } }}>
      <LevelPage levelOptions={levelOptions} />
    </SWRConfig>
  );
}
