import React, { useCallback, useState } from 'react';
import { FilterButton } from '../search';
import { GetServerSidePropsContext } from 'next';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import World from '../../models/db/world';
import { WorldModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import useStats from '../../hooks/useStats';

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

  let worlds = null;

  if (index === 'all') {
    worlds = await WorldModel.find<World>({ userId: { $exists: false } }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id',
        match: { isDraft: false },
      })
      .sort({ name: 1 });
  }

  return {
    props: {
      worlds: JSON.parse(JSON.stringify(worlds)),
    } as CollectionsProps,
    revalidate: 60 * 60,
  };
}

interface CollectionsProps {
  worlds: World[];
}

export default function Collections({ worlds }: CollectionsProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();

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
