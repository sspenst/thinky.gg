import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import formattedAuthorNote from '../../../components/formattedAuthorNote';
import LinkInfo from '../../../components/linkInfo';
import Page from '../../../components/page';
import Select from '../../../components/select';
import SelectFilter from '../../../components/selectFilter';
import Dimensions from '../../../constants/dimensions';
import { enrichLevels } from '../../../helpers/enrich';
import filterSelectOptions, { FilterSelectOption } from '../../../helpers/filterSelectOptions';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection, { EnrichedCollection } from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
import { CollectionModel } from '../../../models/mongoose';
import SelectOption from '../../../models/selectOption';
import SelectOptionStats from '../../../models/selectOptionStats';

interface CollectionUrlQueryParams extends ParsedUrlQuery {
  slugName: string;
  username: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  if (!context.params) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const { username, slugName } = context.params as CollectionUrlQueryParams;

  if (!username || !slugName || slugName.length === 0) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const collection = await CollectionModel.findOne<Collection>({ slug: username + '/' + slugName })
    .populate({
      path: 'levels',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', 'name');

  if (!collection) {
    logger.error('CollectionModel.find returned null in pages/collection');

    return {
      notFound: true,
    };
  }

  const enrichedCollectionLevels = await enrichLevels(collection.levels, reqUser);
  const newCollection = JSON.parse(JSON.stringify(collection));

  newCollection.levels = enrichedCollectionLevels;

  return {
    props: {
      collection: JSON.parse(JSON.stringify(newCollection)),
    } as CollectionProps
  };
}

interface CollectionProps {
  collection: EnrichedCollection;
}

/* istanbul ignore next */
export default function CollectionPage({ collection }: CollectionProps) {
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);
  const { id } = router.query;

  const getOptions = useCallback(() => {
    if (!collection || !collection.levels) {
      return [];
    }

    const levels = collection.levels as EnrichedLevel[];

    return levels.map((level) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}?wid=${id}`,
      new SelectOptionStats(level.leastMoves, level.userMoves),
      (!collection.userId || collection.userId._id !== level.userId._id) ?
        Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      (!collection.userId || collection.userId._id !== level.userId._id) ? level.userId.name : undefined,
      level.points,
      level,
    ));
  }, [collection, id]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  return (
    <Page
      folders={[
        ... collection && !collection.userId ?
          [new LinkInfo('Campaigns', '/campaigns')] :
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
            {formattedAuthorNote(collection.authorNote)}
          </div>
        }
        <SelectFilter
          filter={showFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} level${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        <Select options={getFilteredOptions()} prefetch={false} />
      </>
    </Page>
  );
}
