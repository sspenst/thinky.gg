import FormattedUser from '@root/components/formatted/formattedUser';
import StatFilter from '@root/constants/statFilter';
import { CollectionType } from '@root/models/constants/collection';
import { getCollection } from '@root/pages/api/collection-by-id/[id]';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useState } from 'react';
import Select from '../../../components/cards/select';
import SelectFilter from '../../../components/cards/selectFilter';
import FormattedAuthorNote from '../../../components/formatted/formattedAuthorNote';
import LinkInfo from '../../../components/formatted/linkInfo';
import AddCollectionModal from '../../../components/modal/addCollectionModal';
import DeleteCollectionModal from '../../../components/modal/deleteCollectionModal';
import Page from '../../../components/page/page';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import statFilterOptions from '../../../helpers/filterSelectOptions';
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

  const collection = await getCollection({
    matchQuery: { slug: username + '/' + slugName },
    reqUser,
  });

  if (!collection && reqUser?.name === username && slugName === 'play-later') {
    return {
      redirect: {
        destination: '/profile/' + reqUser.name + '/collections',
        permanent: false,
      },
    };
  }

  if (!collection) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      collection: JSON.parse(JSON.stringify(collection)),
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
        {collection.userId._id.toString() === user?._id.toString() &&
          <div className='flex justify-center items-center gap-1 italic'>
            {collection.isPrivate ?
              <>
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' />
                </svg>
                Private
              </>
              :
              <>
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67m0 0a9 9 0 01-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25' />
                </svg>
                Public
              </>
            }
          </div>
        }
        {!collection.authorNote ? null :
          <div className='p-2 text-center'>
            <FormattedAuthorNote authorNote={collection.authorNote} />
          </div>
        }
        {user?._id === collection.userId._id && collection.type !== CollectionType.PlayLater &&
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
