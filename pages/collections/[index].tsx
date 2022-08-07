import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import StatsHelper from '../../helpers/statsHelper';
import useStats from '../../hooks/useStats';
import dbConnect from '../../lib/dbConnect';
import Collection from '../../models/db/collection';
import { CollectionModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import { FilterButton } from '../search';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface CollectionsParams extends ParsedUrlQuery {
  index: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { index } = context.params as CollectionsParams;

  let collections = null;

  if (index === 'all') {
    collections = await CollectionModel.find<Collection>({ userId: { $exists: false } }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 });
  }

  return {
    props: {
      collections: JSON.parse(JSON.stringify(collections)),
    } as CollectionsProps,
    revalidate: 60 * 60,
  };
}

interface CollectionsProps {
  collections: Collection[];
}

export default function Collections({ collections }: CollectionsProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();

  const getOptions = useCallback(() => {
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

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (
    <Page title={'Collections'}>
      <>
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterClick} selected={showFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterClick} selected={showFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + getOptions().length + ' collections...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()}/>
      </>
    </Page>
  );
}
