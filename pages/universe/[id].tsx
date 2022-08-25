import { ObjectId } from 'bson';
import { debounce } from 'debounce';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectFilter from '../../components/selectFilter';
import Dimensions from '../../constants/dimensions';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import { enrichCollection, enrichLevels } from '../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getProfileSlug from '../../helpers/getProfileSlug';
import naturalSort from '../../helpers/naturalSort';
import usePush from '../../hooks/usePush';
import useUserById from '../../hooks/useUserById';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import LinkInfo from '../../models/linkInfo';
import { CollectionModel, UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { doQuery } from '../api/search';
import { SearchQuery } from '../search';

interface UniverseParams extends ParsedUrlQuery {
  id: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const { id } = context.params as UniverseParams;

  if (!ObjectId.isValid(id)) {
    return { props: {
      error: 'Could not find this user',
      levels: [],
      searchQuery: {},
      total: 0,
    } };
  }

  const universe = await UserModel.findById<User>(id);

  if (!universe) {
    return { props: {
      error: 'Could not find this user',
      levels: [],
      searchQuery: {},
      total: 0,
    } };
  }

  const searchQuery: SearchQuery = {
    sort_by: 'name',
    sort_dir: 'asc',
    time_range: TimeRange[TimeRange.All]
  };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as SearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  searchQuery.searchAuthorId = universe._id.toString();

  const [collections, query] = await Promise.all([
    CollectionModel.find<Collection>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id leastMoves',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
    doQuery(searchQuery, reqUser?._id.toString(), '_id name data leastMoves points width height slug'),
  ]);

  if (!query) {
    throw new Error('Error finding Levels');
  }

  const enrichedCollections = await Promise.all(collections.map(collection => enrichCollection(collection, reqUser)));
  const enrichedLevels = await enrichLevels(query.levels, reqUser);

  return {
    props: {
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
      enrichedLevels: JSON.parse(JSON.stringify(enrichedLevels)),
      searchQuery: searchQuery,
      totalRows: query.totalRows,
    } as UniversePageProps,
  };
}

interface UniversePageProps {
  enrichedCollections: EnrichedCollection[];
  enrichedLevels: EnrichedLevel[];
  searchQuery: SearchQuery;
  totalRows: number;
}

export default function UniversePage({ enrichedCollections, enrichedLevels, searchQuery, totalRows }: UniversePageProps) {
  const [collectionFilterText, setCollectionFilterText] = useState('');
  const firstLoad = useRef(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const routerPush = usePush();
  const [searchLevel, setSearchLevel] = useState('');
  const [searchLevelText, setSearchLevelText] = useState('');
  const { setIsLoading } = useContext(AppContext);
  const [showCollectionFilter, setShowCollectionFilter] = useState(FilterSelectOption.All);
  const [showLevelFilter, setShowLevelFilter] = useState(FilterSelectOption.All);

  const { id } = router.query;
  const universe = useUserById(id).user;
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));

  useEffect(() => {
    setLoading(false);
  }, [enrichedLevels]);

  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  const getCollectionOptions = useCallback(() => {
    if (!enrichedCollections) {
      return [];
    }

    // sort collections by name but use a natural sort
    const sortedEnrichedCollections = naturalSort(enrichedCollections) as EnrichedCollection[];

    return sortedEnrichedCollections.map(enrichedCollection => new SelectOption(
      enrichedCollection._id.toString(),
      enrichedCollection.name,
      `/collection/${enrichedCollection._id.toString()}`,
      new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount),
    )).filter(option => option.stats?.total);
  }, [enrichedCollections]);

  const getFilteredCollectionOptions = useCallback(() => {
    return filterSelectOptions(getCollectionOptions(), showCollectionFilter, collectionFilterText);
  }, [collectionFilterText, getCollectionOptions, showCollectionFilter]);

  const getLevelOptions = useCallback(() => {
    if (!universe || !enrichedLevels) {
      return [];
    }

    return enrichedLevels.map((level) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}`,
      new SelectOptionStats(level.leastMoves, level.userMoves),
      Dimensions.OptionHeightMedium,
      undefined,
      level.points,
      level,
    ));
  }, [enrichedLevels, universe]);

  const fetchLevels = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    //firstLoad.current = true;
    // this url but strip any query params
    const url_until_query = url.split('?')[0];
    const routerUrl = url_until_query + '?search=' + encodeURIComponent(searchLevel) + '&show_filter=' + encodeURIComponent(showLevelFilter) + '&page=' + encodeURIComponent(page);

    setUrl(routerUrl);
  }, [page, searchLevel, showLevelFilter, url]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    setSearchLevel(searchQuery.search || '');
    setSearchLevelText(searchQuery.search || '');
    setShowLevelFilter(searchQuery.show_filter || FilterSelectOption.All);
    setPage(searchQuery.page ? parseInt(searchQuery.page as string) : 1);
  }, [searchQuery]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchLevelQueryVariable = useCallback(
    debounce((name: string) => {
      setSearchLevel(name);
    }, 500),
    []
  );

  useEffect(() => {
    setPage(1);
    setSearchLevelQueryVariable(searchLevelText);
  }, [setSearchLevelQueryVariable, searchLevelText]);

  const onFilterCollectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowCollectionFilter(showCollectionFilter === value ? FilterSelectOption.All : value);
    setPage(1);
  };

  const onFilterLevelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowLevelFilter(showLevelFilter === value ? FilterSelectOption.All : value);
    setPage(1);
  };

  return (!universe ? null :
    <Page
      folders={[new LinkInfo('Catalog', '/catalog/all')]}
      title={universe.name}
      titleHref={getProfileSlug(universe)}
    >
      <>
        {getCollectionOptions().length === 0 ? null : <>
          <SelectFilter
            filter={showCollectionFilter}
            onFilterClick={onFilterCollectionClick}
            placeholder={`Search ${getFilteredCollectionOptions().length} collection${getFilteredCollectionOptions().length !== 1 ? 's' : ''}...`}
            searchText={collectionFilterText}
            setSearchText={setCollectionFilterText}
          />
          <div>
            <Select options={getFilteredCollectionOptions()} />
          </div>
          <div
            style={{
              borderBottom: '1px solid',
              borderColor: 'var(--bg-color-3)',
              margin: '0 auto',
              width: '90%',
            }}
          >
          </div>
        </>}
        <div className='flex justify-center pt-2'>
          <svg className={'animate-spin -ml-1 mr-3 h-5 w-5 text-white ' + (!loading ? 'invisible' : '')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <SelectFilter
          filter={showLevelFilter}
          onFilterClick={onFilterLevelClick}
          placeholder={`Search ${totalRows} level${totalRows !== 1 ? 's' : ''}...`}
          searchText={searchLevelText}
          setSearchText={setSearchLevelText}
        />
        <div className='flex justify-center pt-2'>
          <Link href={'/search?time_range=All&searchAuthor=' + universe.name}><a className='underline'>Advanced search</a></Link>
        </div>
        <div>
          <Select options={getLevelOptions()} />
        </div>
        {totalRows > 20 &&
        <div className='flex justify-center pt-2 flex-col'>
          <div className='flex justify-center flex-row'>
            { (page > 1) && (
              <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page - 1) }>Previous</button>
            )}
            <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / 20)}</div>
            { totalRows > (page * 20) && (
              <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page + 1) }>Next</button>
            )}
          </div>
          <div className='flex justify-center p-3 pb-6'>
            <Link href={'/search?time_range=All&searchAuthor=' + universe.name}><a className='underline'>View rest of {universe.name}&apos;s levels</a></Link>
          </div>
        </div>
        }
      </>
    </Page>
  );
}
