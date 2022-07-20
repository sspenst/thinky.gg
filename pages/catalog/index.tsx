import React, { useCallback, useState } from 'react';
import { FilterButton } from '../search';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import useStats from '../../hooks/useStats';

export async function getStaticProps() {
  await dbConnect();

  const levels = await LevelModel.find({ isDraft: false }, '_id')
    .populate('userId', 'name');

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
    } as CatalogProps,
    revalidate: 60 * 60,
  };
}

interface CatalogProps {
  levels: Level[];
}

export default function Catalog({ levels }: CatalogProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const universes: User[] = [];
    const universesToLevelIds: {[userId: string]: Types.ObjectId[]} = {};

    for (let i = 0; i < levels.length; i++) {
      const level: Level = levels[i];
      const user: User = level.userId;
      const universeId = user._id.toString();

      if (!(universeId in universesToLevelIds)) {
        universes.push(user);
        universesToLevelIds[universeId] = [];
      }

      universesToLevelIds[universeId].push(level._id);
    }

    universes.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const options = [];
    const universeStats = StatsHelper.universeStats(stats, universes, universesToLevelIds);

    for (let i = 0; i < universes.length; i++) {
      options.push(new SelectOption(
        universes[i]._id.toString(),
        universes[i].name,
        `/universe/${universes[i]._id.toString()}`,
        universeStats[i],
      ));
    }

    return options.filter(option => option ? option.stats?.total : true);
  }, [levels, stats]);

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
            <FilterButton first={true} onClick={onFilterClick} selected={showFilter === 'hide_won'} text='Hide Won' value='hide_won' />
            <FilterButton last={true} onClick={onFilterClick} selected={showFilter === 'only_attempted'} text='Show In Progress' value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + levels.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()}/>
      </>
    </Page>
  );
}
