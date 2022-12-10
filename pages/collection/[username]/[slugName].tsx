import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo } from 'next-seo';
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
import { EnrichedCollection } from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
import SelectOption from '../../../models/selectOption';
import SelectOptionStats from '../../../models/selectOptionStats';
import { getCollection } from '../../api/collection/[id]';

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
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  const collection = await getCollection({ $match: { slug: username + '/' + slugName } });

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
  const [showFilter, setShowFilter] = useState(FilterSelectOption.All);

  const getOptions = useCallback(() => {
    if (!collection.levels) {
      return [];
    }

    const levels = collection.levels as EnrichedLevel[];
    const showAuthor = levels.some(level => level.userId._id !== collection.userId._id);

    return levels.map(level => {
      return {
        author: showAuthor ? level.userId.name : undefined,
        height: showAuthor ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
        href: `/level/${level.slug}?cid=${collection._id}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    });
  }, [collection]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as FilterSelectOption;

    setShowFilter(showFilter === value ? FilterSelectOption.All : value);
  };

  return (<>
    <NextSeo
      title={`${collection.name} - Pathology`}
      description={collection.authorNote}
      canonical={`https://pathology.gg/collection/${collection.slug}`}
      openGraph={{
        title: `${collection.name} - Pathology`,
        description: collection.authorNote,
        type: 'article',
        url: `/collection/${collection.slug}`,
      }}
    />
    <Page
      folders={[new LinkInfo(collection.userId.name, `/profile/${collection.userId.name}/collections`)]}
      title={collection.name ?? 'Loading...'}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {collection.name}
        </h1>
        {!collection.authorNote ? null :
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
  </>);
}
