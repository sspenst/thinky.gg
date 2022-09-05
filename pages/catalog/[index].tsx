import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import StatsHelper from '../../helpers/statsHelper';
import useStats from '../../hooks/useStats';
import dbConnect from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import { FilterButton } from '../search';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

export interface UserWithLevels {
  _id: Types.ObjectId;
  levels: Types.ObjectId[];
  name: string;
}

interface CatalogParams extends ParsedUrlQuery {
  index: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { index } = context.params as CatalogParams;

  let usersWithLevels = null;

  if (index === 'all') {
    // get all levels grouped by userId
    usersWithLevels = await LevelModel.aggregate<UserWithLevels>([
      {
        $match: { isDraft: false },
      },
      {
        $group: {
          _id: '$userId',
          levels: { $push: '$_id' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: '$_id',
          levels: '$levels',
          name: '$user.name',
        },
      },
    ]);
  }

  return {
    props: {
      usersWithLevels: JSON.parse(JSON.stringify(usersWithLevels)),
    } as CatalogProps,
    revalidate: 60 * 60,
  };
}

interface CatalogProps {
  usersWithLevels: UserWithLevels[];
}

export default function Catalog({ usersWithLevels }: CatalogProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!usersWithLevels) {
      return [];
    }

    usersWithLevels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const options = [];
    const universeStats = StatsHelper.universeStats(stats, usersWithLevels);

    for (let i = 0; i < usersWithLevels.length; i++) {
      options.push(new SelectOption(
        usersWithLevels[i]._id.toString(),
        usersWithLevels[i].name,
        `/universe/${usersWithLevels[i]._id.toString()}`,
        universeStats[i],
      ));
    }

    return options.filter(option => option ? option.stats?.total : true);
  }, [stats, usersWithLevels]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (
    <Page title={'Catalog'}>
      <>
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterClick} selected={showFilter === 'hide_won'} value='hide_won' />
            <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterClick} selected={showFilter === 'only_attempted'} value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + getOptions().length + ' authors...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()}/>
      </>
    </Page>
  );
}
