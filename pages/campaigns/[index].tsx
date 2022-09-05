import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectFilter from '../../components/selectFilter';
import { enrichCollection } from '../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../helpers/filterSelectOptions';
import { logger } from '../../helpers/logger';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../models/db/collection';
import { CollectionModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

interface CampaignsParams extends ParsedUrlQuery {
  index: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!context.params) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  await dbConnect();

  const { index } = context.params as CampaignsParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  let enrichedCollections = null;

  if (index !== 'all') {
    return {
      notFound: true,
    };
  }

  const collections = await CollectionModel.find<Collection>({ userId: { $exists: false } }, 'levels name')
    .populate({
      path: 'levels',
      select: '_id leastMoves',
      match: { isDraft: false },
    })
    .sort({ name: 1 });

  if (!collections) {
    logger.error('CollectionModel.find returned null in pages/campaigns');

    return {
      notFound: true,
    };
  }

  enrichedCollections = await Promise.all(collections.map(collection => enrichCollection(collection, reqUser)));

  return {
    props: {
      enrichedCollections: JSON.parse(JSON.stringify(enrichedCollections)),
    } as CampaignsProps
  };
}

interface CampaignsProps {
  enrichedCollections: EnrichedCollection[];
}

/* istanbul ignore next */

export default function Campaigns({ enrichedCollections }: CampaignsProps) {
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
    <Page title={'Campaigns'}>
      <>
        <SelectFilter
          filter={showFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} campaign${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} />
      </>
    </Page>
  );
}
