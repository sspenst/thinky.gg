import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import Game from '../../components/level/game';
import Page from '../../components/page';
import SkeletonPage from '../../components/skeletonPage';
import getSWRKey from '../../helpers/getSWRKey';
import useWorldById from '../../hooks/useWorldById';
import dbConnect from '../../lib/dbConnect';
import Level from '../../models/db/level';
import User from '../../models/db/user';
import World from '../../models/db/world';
import LinkInfo from '../../models/linkInfo';
import { LevelModel, UserModel, WorldModel } from '../../models/mongoose';

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
  const worlds = await WorldModel.find<World>({
    userId: { $in: userIds },
  }).populate({
    path: 'levels',
    select: '_id',
    match: { isDraft: false },
  });

  if (!worlds) {
    throw new Error('Error finding Worlds');
  }

  return {
    paths: worlds.map(world => world.levels).flat().map(level => {
      return {
        params: {
          id: level._id.toString(),
        },
      };
    }),
    fallback: true,
  };
}

interface LevelParams extends ParsedUrlQuery {
  params: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { params } = context.params as LevelParams;
  let level, id;
  if (params.length === 1) {
    const id = params[0];
    level = await LevelModel.findById<Level>(id)
      .populate('userId', 'name');
  } else {
    const [username, slugName] = params;
    const user = await UserModel.findOne({ name: username });
    if (!user) {
      throw new Error('User not found');
    }
    
    level = await LevelModel.findOne({
      slug: slugName,
      userId: user._id,
    });
  }
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
  if (router.isFallback || !level) {
    return <SkeletonPage/>;
  }
  const id = level._id;
  const levelProps = {level:level};
  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-id/${id}`)]: level } }}>
      <LevelPage {...levelProps} />
    </SWRConfig>
  );
}

function LevelPage(levelProps:any) {
  const router = useRouter();
  const { wid } = router.query;
  const { level } = levelProps;
  const { world } = useWorldById(wid);

  const folders = [
    new LinkInfo('Catalog', '/catalog'),
  ];

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
