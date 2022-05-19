import { LevelModel, WorldModel } from '../../models/mongoose';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
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
    .find<Level>({ isDraft: false }, '_id officialUserId userId');

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
  const [universe, worlds] = await Promise.all([
    UserModel.findOne<User>({ _id: id }, 'isOfficial name'),
    WorldModel.find<World>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
  ]);

  if (!universe) {
    throw new Error(`Error finding User ${id}`);
  }

  if (!worlds) {
    throw new Error(`Error finding Worlds by userId: ${id}`);
  }

  return {
    props: {
      universe: JSON.parse(JSON.stringify(universe)),
      worlds: JSON.parse(JSON.stringify(worlds)),
    } as UniversePageSWRProps,
    revalidate: 60 * 60,
  };
}

interface UniversePageSWRProps {
  universe: User;
  worlds: World[];
}

export default function UniverseSWRPage({ universe, worlds }: UniversePageSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/user-by-id/${id}`)]: universe,
    } }}>
      <UniversePage worlds={worlds} />
    </SWRConfig>
  );
}

interface UniversePageProps {
  worlds: World[];
}

function UniversePage({ worlds }: UniversePageProps) {
  const router = useRouter();
  const { stats } = useStats();
  const { id } = router.query;
  const universe = useUserById(id).user;

  const getOptions = useCallback(() => {
    if (!worlds) {
      return [];
    }

    const worldStats = StatsHelper.worldStats(stats, worlds);

    return worlds.map((world, index) => new SelectOption(
      world.name,
      `/world/${world._id.toString()}`,
      worldStats[index],
    )).filter(option => option.stats?.total);
  }, [stats, worlds]);

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
