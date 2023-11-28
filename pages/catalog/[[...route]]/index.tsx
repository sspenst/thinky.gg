// TODO: https://github.com/sspenst/pathology/issues/169
// ignoring because we will eventually deprecate this page
/* istanbul ignore file */

import StatFilter from '@root/constants/statFilter';
import * as mongoose from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import React, { useCallback, useState } from 'react';
import Select from '../../../components/cards/select';
import SelectFilter from '../../../components/cards/selectFilter';
import Page from '../../../components/page/page';
import statFilterOptions from '../../../helpers/filterSelectOptions';
import getUserStats from '../../../helpers/getUserStats';
import useStats from '../../../hooks/useStats';
import dbConnect from '../../../lib/dbConnect';
import { LevelModel, UserModel } from '../../../models/mongoose';
import SelectOption from '../../../models/selectOption';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

export interface UserWithLevels {
  _id: mongoose.Types.ObjectId;
  levels: mongoose.Types.ObjectId[];
  name: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  if (context.params?.route) {
    return { notFound: true };
  }

  let usersWithLevels: UserWithLevels[] = [];

  if (process.env.OFFLINE_BUILD !== 'true') {
    await dbConnect();

    // get all levels grouped by userId
    usersWithLevels = await LevelModel.aggregate<UserWithLevels>([
      {
        $match: { isDeleted: { $ne: true }, isDraft: false },
      },
      {
        $group: {
          _id: '$userId',
          levels: { $push: '$_id' },
        },
      },
      {
        $lookup: {
          from: UserModel.collection.name,
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
  const [statFilter, setStatFilter] = useState(StatFilter.All);
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!usersWithLevels) {
      return [];
    }

    usersWithLevels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const options = [];
    const userStats = getUserStats(stats, usersWithLevels);

    for (let i = 0; i < usersWithLevels.length; i++) {
      options.push({
        href: `/profile/${usersWithLevels[i].name}/levels`,
        id: usersWithLevels[i]._id.toString(),
        searchLabel: usersWithLevels[i].name,
        stats: userStats[i],
        text: usersWithLevels[i].name,
      } as SelectOption);
    }

    return options.filter(option => option ? option.stats?.total : true);
  }, [stats, usersWithLevels]);

  const getFilteredOptions = useCallback(() => {
    return statFilterOptions(getOptions(), statFilter, filterText);
  }, [filterText, getOptions, statFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as StatFilter;

    setStatFilter(statFilter === value ? StatFilter.All : value);
  };

  return (
    <Page title={'Catalog'}>
      <div className='p-2'>
        <SelectFilter
          filter={statFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} author${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} />
      </div>
    </Page>
  );
}
