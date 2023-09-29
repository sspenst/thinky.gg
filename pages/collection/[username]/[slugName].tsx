import FormattedUser from '@root/components/formatted/formattedUser';
import StatFilter from '@root/constants/statFilter';
import { getCollection2 } from '@root/pages/api/collection-by-id/[id]';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useState } from 'react';
import Select from '../../../components/cards/select';
import SelectFilter from '../../../components/cards/selectFilter';
import formattedAuthorNote from '../../../components/formatted/formattedAuthorNote';
import LinkInfo from '../../../components/formatted/linkInfo';
import AddCollectionModal from '../../../components/modal/addCollectionModal';
import DeleteCollectionModal from '../../../components/modal/deleteCollectionModal';
import Page from '../../../components/page/page';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import statFilterOptions from '../../../helpers/filterSelectOptions';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedCollection } from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
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
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  const collectionAgg = await getCollection2({ $match: { slug: username + '/' + slugName } }, reqUser);

  if (!collectionAgg) {
    logger.error('CollectionModel.find returned null in pages/collection');

    return {
      notFound: true,
    };
  }

  return {
    props: {
      collection: JSON.parse(JSON.stringify(collectionAgg)),
    } as CollectionProps
  };
}

interface CollectionProps {
  collection: EnrichedCollection;
}

/* istanbul ignore next */
export default function CollectionPage({ collection }: CollectionProps) {
  const [filterText, setFilterText] = useState('');
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [isDeleteCollectionOpen, setIsDeleteCollectionOpen] = useState(false);
  const [statFilter, setStatFilter] = useState(StatFilter.All);
  const { user } = useContext(AppContext);

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
    return statFilterOptions(getOptions(), statFilter, filterText);
  }, [filterText, getOptions, statFilter]);

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as StatFilter;

    setStatFilter(statFilter === value ? StatFilter.All : value);
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
      <div className='flex flex-col gap-2 justify-center'>
        <div className='flex flex-wrap gap-2 text-center justify-center items-center pt-3 px-3'>
          <h1 className='text-2xl font-bold break-words max-w-full'>
            {collection.name}
          </h1>
          <div className='flex flex-row gap-2 justify-center items-center truncate'>
            <span>by</span>
            <FormattedUser id='collection' user={collection.userId} />
          </div>
        </div>
        {!collection.authorNote ? null :
          <div className='p-2'
            style={{
              textAlign: 'center',
            }}
          >
            {formattedAuthorNote(collection.authorNote)}
          </div>
        }
        {user?._id === collection.userId._id &&
          <div className='flex flex-row gap-4 justify-center'>
            <button
              className='italic underline'
              onClick={() => {
                setIsAddCollectionOpen(true);
              }}
            >
              Edit
            </button>
            <button
              className='italic underline'
              onClick={() => {
                setIsDeleteCollectionOpen(true);
              }}
            >
              Delete
            </button>
            <AddCollectionModal
              closeModal={() => {
                setIsAddCollectionOpen(false);
              }}
              collection={collection}
              isOpen={isAddCollectionOpen}
            />
            <DeleteCollectionModal
              closeModal={() => {
                setIsDeleteCollectionOpen(false);
              }}
              collection={collection}
              isOpen={isDeleteCollectionOpen}
            />
          </div>
        }
        <SelectFilter
          filter={statFilter}
          onFilterClick={onFilterClick}
          placeholder={`Search ${getFilteredOptions().length} level${getFilteredOptions().length !== 1 ? 's' : ''}...`}
          searchText={filterText}
          setSearchText={setFilterText}
        />
        {user?._id === collection.userId._id &&
          <div className='flex justify-center'>
            <Link
              className='italic underline'
              href={`/edit/collection/${collection._id}`}
            >
              Reorder Levels
            </Link>
          </div>
        }
        <Select options={getFilteredOptions()} prefetch={false} />
      </div>
    </Page>
  </>);
}
