import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import { SWRConfig } from 'swr';
import Page from '../../components/page';
import Select from '../../components/select';
import SkeletonPage from '../../components/skeletonPage';
import Dimensions from '../../constants/dimensions';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import getSWRKey from '../../helpers/getSWRKey';
import StatsHelper from '../../helpers/statsHelper';
import useStats from '../../hooks/useStats';
import useUserById from '../../hooks/useUserById';
import dbConnect from '../../lib/dbConnect';
import Collection from '../../models/db/collection';
import Level from '../../models/db/level';
import User from '../../models/db/user';
import LinkInfo from '../../models/linkInfo';
import { CollectionModel, LevelModel, UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import { FilterButton } from '../search';

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
  const [collections, levels, universe] = await Promise.all([
    CollectionModel.find<Collection>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
    LevelModel.find<Level>({ isDraft: false, userId: id })
      .sort({ name: 1 }),
    UserModel.findOne<User>({ _id: id }, 'name'),
  ]);

  return {
    props: {
      collections: JSON.parse(JSON.stringify(collections)),
      levels: JSON.parse(JSON.stringify(levels)),
      universe: JSON.parse(JSON.stringify(universe)),
    } as UniversePageSWRProps,
    revalidate: 60 * 60,
  };
}

interface UniversePageSWRProps {
  collections: Collection[];
  levels: Level[];
  universe: User;
}

export default function UniverseSWRPage({ collections, levels, universe }: UniversePageSWRProps) {
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
      <UniversePage collections={collections} levels={levels} />
    </SWRConfig>
  );
}

interface UniversePageProps {
  collections: Collection[];
  levels: Level[];
}

function UniversePage({ collections, levels }: UniversePageProps) {
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();
  const { id } = router.query;
  const universe = useUserById(id).user;

  const getCollectionOptions = useCallback(() => {
    if (!collections) {
      return [];
    }

    const collectionStats = StatsHelper.collectionStats(collections, stats);

    return collections.map((collection, index) => new SelectOption(
      collection._id.toString(),
      collection.name,
      `/collection/${collection._id.toString()}`,
      collectionStats[index],
    )).filter(option => option.stats?.total);
  }, [collections, stats]);

  const getFilteredCollectionOptions = useCallback(() => {
    return filterSelectOptions(getCollectionOptions(), showFilter, filterText);
  }, [filterText, getCollectionOptions, showFilter]);

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
        <Select options={getFilteredCollectionOptions()}/>
        {getFilteredCollectionOptions().length === 0 || getFilteredLevelOptions().length === 0 ? null :
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
