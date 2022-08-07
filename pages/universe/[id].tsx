import { CollectionModel, LevelModel, UserModel } from '../../models/mongoose';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Collection from '../../models/db/collection';
import Dimensions from '../../constants/dimensions';
import { EnrichedLevel, FilterButton, SearchProps, SearchQuery } from '../search';
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
import dbConnect from '../../lib/dbConnect';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import getSWRKey from '../../helpers/getSWRKey';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUserById from '../../hooks/useUserById';
import { getUserFromToken } from '../../lib/withAuth';
import TimeRange from '../../constants/timeRange';
import { doQuery } from '../api/search';
import { debounce } from 'debounce';
import usePush from '../../hooks/usePush';
import user from '../api/user';
import Link from 'next/link';

interface UniverseParams extends ParsedUrlQuery {
  id: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  // must be authenticated
  const { id } = context.params as UniverseParams;
  const user = await UserModel.findById(id);

  if (!user) {
    throw new Error('No user found');
  }

  let searchQuery: SearchQuery = {
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Week]
  };

  // check if context.query is empty
  if (context.query && (Object.keys(context.query).length > 0)) {
    searchQuery = context.query as SearchQuery;
  }

  searchQuery.searchAuthor = user.name;
  const [collections, query] = await Promise.all([
    CollectionModel.find<Collection>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
    await doQuery(searchQuery, user._id.toString())
  ]);

  if (!query) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      collections: JSON.parse(JSON.stringify(collections)),
      levels: JSON.parse(JSON.stringify(query.data)),
      searchQuery: searchQuery,
      total: query.total,
    } as UniversePageProps,
  };
}

interface UniversePageProps {
  collections: Collection[];
  searchQuery: SearchQuery;
  total: number;
  levels: Level[];
}

export default function UniversePage({ collections, levels, searchQuery, total }: UniversePageProps) {
  const [collectionFilterText, setCollectionFilterText] = useState('');

  const [searchLevel, setSearchLevel] = useState('');
  const [searchLevelText, setSearchLevelText] = useState('');
  const routerPush = usePush();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showCollectionFilter, setShowCollectionFilter] = useState('');
  const [showLevelFilter, setShowLevelFilter] = useState('');
  const { stats } = useStats();
  const { id } = router.query;
  const universe = useUserById(id).user;
  const firstLoad = useRef(true);
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));
  const enrichWithStats = useCallback((levels: EnrichedLevel[]) => {
    const levelStats = StatsHelper.levelStats(levels, stats);

    for (let i = 0; i < levels.length; i++) {
      levels[i].stats = levelStats[i];
    }

    return levels;
  }, [stats]);

  const [dataLevels, setDataLevels] = useState(enrichWithStats(levels));

  useEffect(() => {
    setDataLevels(enrichWithStats(levels));
    setLoading(false);
  }, [levels, total, enrichWithStats]);
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
  }, [stats, collections]);

  const getFilteredCollectionOptions = useCallback(() => {
    return filterSelectOptions(getCollectionOptions(), showCollectionFilter, collectionFilterText);
  }, [collectionFilterText, getCollectionOptions, showCollectionFilter]);

  const getLevelOptions = useCallback(() => {
    if (!universe || !levels) {
      return [];
    }

    return dataLevels.map((level) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}`,
      level.stats,
      Dimensions.OptionHeightMedium,
      undefined,
      level.points,
      level,
    ));
  }, [dataLevels, levels, universe]);

  // @TODO: enrich the data in getStaticProps.
  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);
  const fetchLevels = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    // this url but strip any query params
    const url_until_query = url.split('?')[0];
    const routerUrl = url_until_query + '?search=' + searchLevel + '&show_filter=' + showLevelFilter;

    setUrl(routerUrl);
  }, [searchLevel, showLevelFilter, url]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);
  useEffect(() => {
    setSearchLevel(searchQuery.search || '');
    setShowLevelFilter(searchQuery.show_filter || '');
  }, [searchQuery]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchLevelQueryVariable = useCallback(
    debounce((name: string) => {
      setSearchLevel(name);
    }, 500),
    []
  );

  useEffect(() => {
    setSearchLevelQueryVariable(searchLevelText);
  }, [setSearchLevelQueryVariable, searchLevelText]);

  const onFilterCollectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowCollectionFilter(showCollectionFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };
  const onFilterLevelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowLevelFilter(showLevelFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
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
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterCollectionClick} selected={showCollectionFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterCollectionClick} selected={showCollectionFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input type='search' key='search-collections' id='search-collections' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + collections.length + ' collections...'} onChange={e => setCollectionFilterText(e.target.value)} value={collectionFilterText} />
            </div>
          </div>
        </div>
        <div>
          <Select options={getFilteredCollectionOptions()}/>
        </div>
        {getFilteredCollectionOptions().length === 0 || getLevelOptions().length === 0 ? null :
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
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterLevelClick} selected={showLevelFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterLevelClick} selected={showLevelFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input key={'search_levels'} id='search-levels' type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + total + ' levels...'} onChange={e => setSearchLevelText(e.target.value)} value={searchLevelText} />
            </div>

          </div>

        </div>
        <div className='flex justify-center pt-2'>
          <Link href={'/search?searchAuthor=' + universe.name}><a className='underline'>Advanced search</a></Link>
        </div>
        <div>
          <Select options={getLevelOptions()}/>
        </div>
        <div className='flex justify-center p-3 pb-6'>

          <Link href={'/search?searchAuthor=' + universe.name}><a className='underline'>View rest of {universe.name}&apos;s levels</a></Link>

        </div>
      </>
    </Page>
  );
}
