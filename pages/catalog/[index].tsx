import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectFilter from '../../components/selectFilter';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import getUniverseStats from '../../helpers/getUniverseStats';
import useStats from '../../hooks/useStats';
import dbConnect from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';

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
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!usersWithLevels) {
      return [];
    }

    usersWithLevels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const options = [];
    const universeStats = getUniverseStats(stats, usersWithLevels);

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
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  return (
    <Page title={'Catalog'}>
      <>
        <SelectFilter
          filter={showFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} author${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} />
      </>
    </Page>
  );
}
