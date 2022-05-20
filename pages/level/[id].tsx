import { LevelModel, UserModel, WorldModel } from '../../models/mongoose';
import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
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

  // generatic static pages for all official levels
  const users = await UserModel.find<User>({ isOfficial: true });

  if (!users) {
    throw new Error('Error finding Users');
  }

  const userIds = users.map(user => user._id);
  const worlds = await WorldModel.find<World>({ userId: { $in: userIds } });

  if (!worlds) {
    throw new Error('Error finding Worlds');
  }

  return {
    paths: worlds.map(world => world.levels).flat().map(level => {
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
    .populate('officialUserId', '_id name')
    .populate('userId', '_id name')
    .populate('worldId', '_id name');

  if (!level) {
    throw new Error(`Error finding Level ${id}`);
  }

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as LevelSWRProps,
    revalidate: 60 * 60,
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

  if (!level || level.isDraft) {
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
      <Game level={level} />
    </Page>
  );
}
