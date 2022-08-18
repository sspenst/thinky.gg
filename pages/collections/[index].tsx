import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectFilter from '../../components/selectFilter';
import { enrichCollection } from '../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Collection from '../../models/db/collection';
import { CollectionModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { EnrichedCollection } from '../search';

interface CollectionsParams extends ParsedUrlQuery {
  index: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { index } = context.params as CollectionsParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  let enrichedCollections = null;

  if (index === 'all') {
    const collections = await CollectionModel.find<Collection>({ userId: { $exists: false } }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id leastMoves',
        match: { isDraft: false },
      })
      .sort({ name: 1 });

    if (!collections) {
      return {
        props: {
          collections: null
        }
      };
    }

    enrichedCollections = await Promise.all(collections.map(collection => enrichCollection(collection, reqUser)));
  }

  return {
    props: {
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
    } as CollectionsProps
  };
}

interface CollectionsProps {
  enrichedCollections: EnrichedCollection[];
}

export default function Collections({ enrichedCollections }: CollectionsProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);

  const getOptions = useCallback(() => {
    if (!enrichedCollections) {
      return [];
    }

    return enrichedCollections.map((enrichedCollection) => new SelectOption(
      enrichedCollection._id.toString(),
      enrichedCollection.name,
      `/collection/${enrichedCollection._id.toString()}`,
      new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount)
    )).filter(option => option.stats?.total);
  }, [enrichedCollections]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  return (
    <Page title={'Collections'}>
      <>
        <SelectFilter
          filter={showFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} collection${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} />
      </>
    </Page>
  );
}
