import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import { SWRConfig } from 'swr';
import FilterButton from '../../components/filterButton';
import Page from '../../components/page';
import Select from '../../components/select';
import SkeletonPage from '../../components/skeletonPage';
import Dimensions from '../../constants/dimensions';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import getSWRKey from '../../helpers/getSWRKey';
import StatsHelper from '../../helpers/statsHelper';
import useCollectionById from '../../hooks/useCollectionById';
import useStats from '../../hooks/useStats';
import dbConnect from '../../lib/dbConnect';
import Collection from '../../models/db/collection';
import LinkInfo from '../../models/linkInfo';
import { CollectionModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface CollectionParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as CollectionParams;
  const collection = await CollectionModel.findById<Collection>(id)
    .populate({
      path: 'levels',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', 'name');

  return {
    props: {
      collection: JSON.parse(JSON.stringify(collection)),
    } as CollectionSWRProps,
    revalidate: 60 * 60,
  };
}

interface CollectionSWRProps {
  collection: Collection;
}

export default function CollectionSWR({ collection }: CollectionSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return <SkeletonPage/>;
  }

  if (!collection) {
    return <SkeletonPage text={'Collection not found'}/>;
  }

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/collection-by-id/${id}`)]: collection,
    } }}>
      <CollectionPage/>
    </SWRConfig>
  );
}

function CollectionPage() {
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();
  const { id } = router.query;
  const { collection } = useCollectionById(id);

  const getOptions = useCallback(() => {
    if (!collection || !collection.levels) {
      return [];
    }

    const levels = collection.levels;
    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}?wid=${id}`,
      levelStats[index],
      (!collection.userId || collection.userId._id !== level.userId._id) ?
        Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      (!collection.userId || collection.userId._id !== level.userId._id) ? level.userId.name : undefined,
      level.points,
      level,
    ));
  }, [collection, id, stats]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (
    <Page
      folders={[
        ... collection && !collection.userId ?
          [new LinkInfo('Collections', '/collections/all')] :
          [new LinkInfo('Catalog', '/catalog/all')],
        ... collection && collection.userId ? [new LinkInfo(collection.userId.name, `/universe/${collection.userId._id}`)] : [],
      ]}
      title={collection?.name ?? 'Loading...'}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {collection?.name}
        </h1>
        {!collection || !collection.authorNote ? null :
          <div className='p-2'
            style={{
              textAlign: 'center',
            }}
          >
            {formatAuthorNote(collection.authorNote)}
          </div>
        }
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onPersonalFilterClick} selected={showFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onPersonalFilterClick} selected={showFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + collection?.levels.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
