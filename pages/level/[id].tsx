import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import World from '../../models/db/world';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import useLevelById from '../../hooks/useLevelById';
import { useRouter } from 'next/router';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  // NB: only get official levels to shorten build time
  const levels = await LevelModel.find<Level>({ officialUserId: { $exists: true } });

  if (!levels) {
    throw new Error('Error finding Levels');
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
  const level = await LevelModel.findById<Level>(id)
    .populate<{officialUserId: User}>('officialUserId', '_id name')
    .populate<{userId: User}>('userId', '_id name')
    .populate<{worldId: World}>('worldId', '_id name');

  if (!level) {
    throw new Error(`Error finding Level ${id}`);
  }

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as LevelSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface LevelSWRProps {
  level: Level;
}

export default function LevelSWR({ level }: LevelSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-id/${id}`)]: level } }}>
      <LevelPage/>
    </SWRConfig>
  );
}

function LevelPage() {
  const router = useRouter();
  const { id } = router.query;
  const { level } = useLevelById(id);

  if (!level) {
    return null;
  }

  const officialUniverse = level.officialUserId;
  const universe = level.userId;
  const world = level.worldId;

  return (
    <Page
      authorNote={level.authorNote}
      folders={[
        new LinkInfo('Catalog', '/catalog'),
        officialUniverse ?
          new LinkInfo(officialUniverse.name, `/universe/${officialUniverse._id}`) :
          new LinkInfo(universe.name, `/universe/${universe._id}`),
        new LinkInfo(world.name, `/world/${world._id}`),
      ]}
      level={level}
      subtitle={officialUniverse ? universe.name : undefined}
      subtitleHref={`/profile/${universe._id}`}
      title={level.name}
    >
      <Game key={level._id.toString()} level={level} world={world} />
    </Page>
  );
}
