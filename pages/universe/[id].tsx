import { LevelModel, UserModel, WorldModel } from '../../models/mongoose';
import React, { useCallback, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { FilterButton } from '../search';
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
import filterSelectOptions from '../../helpers/filterSelectOptions';
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
    UserModel.findOne<User>({ _id: id }, 'name'),
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
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();
  const { id } = router.query;
  const universe = useUserById(id).user;

  const getWorldOptions = useCallback(() => {
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

  const getFilteredWorldOptions = useCallback(() => {
    return filterSelectOptions(getWorldOptions(), showFilter, filterText);
  }, [filterText, getWorldOptions, showFilter]);

  const getLevelOptions = useCallback(() => {
    if (!universe || !levels) {
      return [];
    }

    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}`,
      levelStats[index],
      Dimensions.OptionHeightMedium,
      undefined,
      level.points,
      level,
    ));
  }, [levels, stats, universe]);

  const getFilteredLevelOptions = useCallback(() => {
    return filterSelectOptions(getLevelOptions(), showFilter, filterText);
  }, [filterText, getLevelOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (!universe ? null :
    <Page
      folders={[new LinkInfo('Catalog', '/catalog/all')]}
      title={universe.name}
      titleHref={`/profile/${universe._id}`}
    >
      <>
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterClick} selected={showFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterClick} selected={showFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + levels.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredWorldOptions()}/>
        {getFilteredWorldOptions().length === 0 || getFilteredLevelOptions().length === 0 ? null :
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
        <Select options={getFilteredLevelOptions()}/>
      </>
    </Page>
  );
}
