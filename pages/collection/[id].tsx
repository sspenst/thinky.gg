import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useState } from 'react';
import FilterButton from '../../components/filterButton';
import Page from '../../components/page';
import Select from '../../components/select';
import Dimensions from '../../constants/dimensions';
import { enrichLevels } from '../../helpers/enrich';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Collection, { cloneCollection } from '../../models/db/collection';
import LinkInfo from '../../models/linkInfo';
import { CollectionModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { EnrichedCollection, EnrichedLevel } from '../search';

interface CollectionParams extends ParsedUrlQuery {
  id: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as CollectionParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const collection = await CollectionModel.findById<Collection>(id)
    .populate({
      path: 'levels',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', 'name');

  if (!collection) {
    return {
      props: {
        collection: null,
      }
    };
  }

  const enrichedCollectionLevels = await enrichLevels(collection.levels, reqUser);
  const newCollection = cloneCollection(collection);

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

export default function CollectionPage({ collection }: CollectionProps) {
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState('');
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
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + collection?.levels?.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
