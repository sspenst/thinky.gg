import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import World from '../../models/db/world';
import { WorldModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUserById from '../../hooks/useUserById';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const universes = await UserModel.find<User>({ isUniverse: true });

  if (!universes) {
    throw new Error('Error finding Users');
  }

  return {
    paths: universes.map(universe => {
      return {
        params: {
          id: universe._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface UniverseParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as UniverseParams;
  const [universe, worlds] = await Promise.all([
    UserModel.findOne<User>({ _id: id, isUniverse: true }, 'isOfficial name'),
    WorldModel.find<World>({ userId: id }, '_id name').sort({ name: 1 }),
  ]);

  if (!universe) {
    throw new Error(`Error finding User ${id}`);
  }
  
  if (!worlds) {
    throw new Error(`Error finding World by userId ${id}`);
  }

  const levels = universe.isOfficial ?
    await LevelModel.find<Level>({ isDraft: { $ne: true }, officialUserId: id }, '_id worldId') :
    await LevelModel.find<Level>({ isDraft: { $ne: true }, userId: id }, '_id worldId');

  if (!levels) {
    throw new Error('Error finding Levels by userId');
  }

  const worldsToLevelIds: {[worldId: string]: Types.ObjectId[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const worldId = level.worldId.toString();

    if (!(worldId in worldsToLevelIds)) {
      worldsToLevelIds[worldId] = [];
    }

    worldsToLevelIds[worldId].push(level._id);
  }

  return {
    props: {
      universe: JSON.parse(JSON.stringify(universe)),
      worlds: JSON.parse(JSON.stringify(worlds)),
      worldsToLevelIds: JSON.parse(JSON.stringify(worldsToLevelIds)),
    } as UniversePageSWRProps,
  };
}

interface UniversePageSWRProps {
  universe: User;
  worlds: World[];
  worldsToLevelIds: {[worldId: string]: Types.ObjectId[]};
}

export default function UniverseSWRPage({ universe, worlds, worldsToLevelIds }: UniversePageSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/user-by-id/${id}`)]: universe } }}>
      <UniversePage worlds={worlds} worldsToLevelIds={worldsToLevelIds} />
    </SWRConfig>
  );
}

interface UniversePageProps {
  worlds: World[];
  worldsToLevelIds: {[worldId: string]: Types.ObjectId[]};
}

function UniversePage({ worlds, worldsToLevelIds }: UniversePageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { stats } = useStats();
  const universe = useUserById(id).user;

  const getOptions = useCallback(() => {
    if (!worlds) {
      return [];
    }

    const worldStats = StatsHelper.worldStats(stats, worlds, worldsToLevelIds);

    return worlds.map((world, index) => new SelectOption(
      world.name,
      `/world/${world._id.toString()}`,
      worldStats[index],
    )).filter(option => option.stats?.total);
  }, [stats, worlds, worldsToLevelIds]);

  return (!universe ? null :
    <Page
      folders={[new LinkInfo('Catalog', '/catalog')]}
      title={universe.name}
      titleHref={!universe.isOfficial ? `/profile/${universe._id}` : undefined}
    >
      <Select options={getOptions()}/>
    </Page>
  );
}
