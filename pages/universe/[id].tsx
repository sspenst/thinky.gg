import { LevelModel, UserModel, WorldModel } from '../../models/mongoose';
import React, { useCallback } from 'react';
import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import User from '../../models/db/user';
import World from '../../models/db/world';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUserById from '../../hooks/useUserById';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface UniverseParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as UniverseParams;
  const [levels, universe, worlds] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false, userId: id })
      .sort({ name: 1 }),
    UserModel.findOne<User>({ _id: id }, 'isOfficial name'),
    WorldModel.find<World>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
  ]);

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      universe: JSON.parse(JSON.stringify(universe)),
      worlds: JSON.parse(JSON.stringify(worlds)),
    } as UniversePageSWRProps,
    revalidate: 60 * 60,
  };
}

interface UniversePageSWRProps {
  levels: Level[];
  universe: User;
  worlds: World[];
}

export default function UniverseSWRPage({ levels, universe, worlds }: UniversePageSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return <SkeletonPage/>;
  }

  if (!universe) {
    return <SkeletonPage text={'Universe not found'}/>;
  }

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/user-by-id/${id}`)]: universe,
    } }}>
      <UniversePage levels={levels} worlds={worlds} />
    </SWRConfig>
  );
}

interface UniversePageProps {
  levels: Level[];
  worlds: World[];
}

function UniversePage({ levels, worlds }: UniversePageProps) {
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
      world._id.toString(),
      world.name,
      `/world/${world._id.toString()}`,
      worldStats[index],
    )).filter(option => option.stats?.total);
  }, [stats, worlds]);

  const getLevelOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}`,
      levelStats[index],
      universe?.isOfficial ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      universe?.isOfficial ? level.userId.name : undefined,
      level.points,
      level,
    ));
  }, [levels, stats, universe]);

  return (!universe ? null :
    <Page
      folders={!universe.isOfficial ? [new LinkInfo('Catalog', '/catalog')] : undefined}
      title={universe.name}
      titleHref={!universe.isOfficial ? `/profile/${universe._id}` : undefined}
    >
      <>
        <Select options={getOptions()}/>
        {getOptions().length === 0 || getLevelOptions().length === 0 ? null :
          <div
            style={{
              borderBottom: '1px solid',
              borderColor: 'var(--bg-color-3)',
              margin: '0 auto',
              width: '90%',
            }}
          >
          </div>
        }
        <Select options={getLevelOptions()}/>
      </>
    </Page>
  );
}
