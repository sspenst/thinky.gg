import { UserModel, WorldModel } from '../../../models/mongoose';
import Game from '../../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../../models/db/level';
import LinkInfo from '../../../models/linkInfo';
import Page from '../../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import SkeletonPage from '../../../components/skeletonPage';
import User from '../../../models/db/user';
import World from '../../../models/db/world';
import dbConnect from '../../../lib/dbConnect';
import { getLevelByUrlPath } from '../../api/level-by-slug/[username]/[slugName]';
import getSWRKey from '../../../helpers/getSWRKey';
import isLocal from '../../../lib/isLocal';
import useLevelBySlug from '../../../hooks/useLevelBySlug';
import { useRouter } from 'next/router';
import useWorldById from '../../../hooks/useWorldById';

export async function getStaticPaths() {
  if (isLocal()) {
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
  const worlds = await WorldModel.find<World>({
    userId: { $in: userIds },
  }).populate({
    path: 'levels',
    select: 'slug',
    match: { isDraft: false },
  });

  if (!worlds) {
    throw new Error('Error finding Worlds');
  }

  return {
    paths: worlds.map(world => world.levels).flat().map(level => {
      const [username, slugName] = level.slug.split('/');

      return {
        params: {
          slugName: slugName,
          username: username,
        },
      };
    }),
    fallback: true,
  };
}

export interface LevelUrlQueryParams extends ParsedUrlQuery {
  slugName: string;
  username: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { slugName, username } = context.params as LevelUrlQueryParams;
  const level = await getLevelByUrlPath(username, slugName);

  if (!level) {
    throw new Error(`Error finding Level ${username}/${slugName}`);
  }

  return {
    props: {
      level: level ? JSON.parse(JSON.stringify(level)) : null,
    } as LevelSWRProps,
    revalidate: 60 * 60,
  };
}

interface LevelSWRProps {
  level: Level;
}

export default function LevelSWR({ level }: LevelSWRProps) {
  const router = useRouter();

  if (router.isFallback || !level) {
    return <SkeletonPage/>;
  }

  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-slug/${level.slug}`)]: level } }}>
      <LevelPage/>
    </SWRConfig>
  );
}

function LevelPage() {
  const router = useRouter();
  const { slugName, username, wid } = router.query as LevelUrlQueryParams;
  const { level } = useLevelBySlug(username + '/' + slugName);
  const { world } = useWorldById(wid);

  const folders: LinkInfo[] = [];

  if (!world || !world.userId.isOfficial) {
    folders.push(
      new LinkInfo('Catalog', '/catalog'),
    );
  }

  if (world) {
    // if a world id was passed to the page we can show more directory info
    const universe = world.userId;

    folders.push(
      new LinkInfo(universe.name, `/universe/${universe._id}`),
      new LinkInfo(world.name, `/world/${world._id}`),
    );
  } else if (level) {
    // otherwise we can only give a link to the author's universe
    folders.push(
      new LinkInfo(level.userId.name, `/universe/${level.userId._id}`),
    );
  }

  // subtitle is only useful when a level is within a world created by a different user
  const showSubtitle = world && level && world.userId._id !== level.userId._id;

  return (
    <Page
      folders={folders}
      level={level}
      subtitle={showSubtitle ? level.userId.name : undefined}
      subtitleHref={showSubtitle ? `/profile/${level.userId._id}` : undefined}
      title={level?.name ?? 'Loading...'}
    >
      {!level || level.isDraft ? <></> : <Game level={level} />}
    </Page>
  );
}
