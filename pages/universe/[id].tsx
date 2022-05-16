import { FilterQuery } from 'mongoose';
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

  const levels = await LevelModel
    .find<Level>({ isDraft: { $ne: true } }, '_id officialUserId userId');

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  const universeIds = [...new Set(levels.map(level => level.officialUserId ?? level.userId))];

  return {
    paths: universeIds.map(universeId => {
      return {
        params: {
          id: universeId.toString()
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
  const universe = await UserModel.findOne<User>({ _id: id }, 'isOfficial name');

  if (!universe) {
    throw new Error(`Error finding User ${id}`);
  }

  const filter: FilterQuery<Level> = { isDraft: { $ne: true }};

  if (universe.isOfficial) {
    filter['officialUserId'] = id;
  } else {
    filter['officialUserId'] = { $exists: false };
    filter['userId'] = id;
  }

  const levels = await LevelModel.find<Level>(filter, '_id worldId')
    .populate<{worldId: World}>('worldId', '_id name');

  if (!levels) {
    throw new Error('Error finding Levels by userId');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      universe: JSON.parse(JSON.stringify(universe)),
    } as UniversePageSWRProps,
    revalidate: 60 * 60,
  };
}

interface UniversePageSWRProps {
  levels: Level[];
  universe: User;
}

export default function UniverseSWRPage({ levels, universe }: UniversePageSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/user-by-id/${id}`)]: universe,
    } }}>
      <UniversePage levels={levels} />
    </SWRConfig>
  );
}

interface UniversePageProps {
  levels: Level[];
}

function UniversePage({ levels }: UniversePageProps) {
  const router = useRouter();
  const { stats } = useStats();
  const { id } = router.query;
  const universe = useUserById(id).user;

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const worlds: World[] = [];
    const worldsToLevelIds: {[worldId: string]: Types.ObjectId[]} = {};
  
    for (let i = 0; i < levels.length; i++) {
      const level: Level = levels[i];
      const world: World = level.worldId;
  
      if (!(world._id.toString() in worldsToLevelIds)) {
        worlds.push(world);
        worldsToLevelIds[world._id.toString()] = [];
      }
  
      worldsToLevelIds[world._id.toString()].push(level._id);
    }

    worlds.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const worldStats = StatsHelper.worldStats(stats, worlds, worldsToLevelIds);

    return worlds.map((world, index) => new SelectOption(
      world.name,
      `/world/${world._id.toString()}`,
      worldStats[index],
    )).filter(option => option.stats?.total);
  }, [levels, stats]);

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
