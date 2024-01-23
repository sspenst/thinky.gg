import LevelCard from '@root/components/cards/levelCard';
import FormattedUser from '@root/components/formatted/formattedUser';
import StatFilter from '@root/constants/statFilter';
import TimeRange from '@root/constants/timeRange';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { CollectionType } from '@root/models/constants/collection';
import { getCollection } from '@root/pages/api/collection-by-id/[id]';
import { doQuery } from '@root/pages/api/search';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import SelectFilter from '../../../../components/cards/selectFilter';
import FormattedAuthorNote from '../../../../components/formatted/formattedAuthorNote';
import LinkInfo from '../../../../components/formatted/linkInfo';
import AddCollectionModal from '../../../../components/modal/addCollectionModal';
import DeleteCollectionModal from '../../../../components/modal/deleteCollectionModal';
import Page from '../../../../components/page/page';
import Dimensions from '../../../../constants/dimensions';
import { AppContext } from '../../../../contexts/appContext';
import dbConnect from '../../../../lib/dbConnect';
import { getUserFromToken } from '../../../../lib/withAuth';
import { EnrichedCollection } from '../../../../models/db/collection';
import Level, { EnrichedLevel } from '../../../../models/db/level';
import SelectOption from '../../../../models/selectOption';
import SelectOptionStats from '../../../../models/selectOptionStats';

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
  const gameId = getGameIdFromReq(context.req);

  const collection = await getCollection({
    matchQuery: {
      gameId: gameId,
      slug: username + '/' + slugName,
    },
    reqUser: reqUser,
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

  const queryParams = context.query || { search: '', page: 0, statFilter: StatFilter.All };
  const { page, search, statFilter } = queryParams;
  const levelIds = collection.levels as Level[];
  const levelIdsAsStrings = levelIds.map(level => level._id.toString()).join(',');
  const queryResult = await doQuery(gameId, {
    includeLevelIds: levelIdsAsStrings,
    page: page ? '' + ( 1 + parseInt(page.toString())) : '1',
    search: search ? search.toString() : '',
    statFilter: statFilter ? statFilter.toString() as StatFilter : StatFilter.All,
    timeRange: TimeRange[TimeRange.All],
    sortBy: 'ts',
    sortDir: 'asc',
  }, reqUser);

  collection.levels = queryResult?.levels ?? [];

  return {
    props: {
      collection: JSON.parse(JSON.stringify(collection)),
      numLevels: queryResult?.totalRows ?? 0,
    } as CollectionProps
  };
}

interface CollectionProps {
  collection: EnrichedCollection;
  numLevels: number;
}

/* istanbul ignore next */
export default function CollectionPage({ collection, numLevels }: CollectionProps) {
  const [filterText, setFilterText] = useState('');
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);
  const [isDeleteCollectionOpen, setIsDeleteCollectionOpen] = useState(false);
  const [statFilter, setStatFilter] = useState(StatFilter.All);
  const { game, user } = useContext(AppContext);

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

  const onFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value as StatFilter;

    setStatFilter(statFilter === value ? StatFilter.All : value);
  };

  const [page, setPage] = useState<number>(0);
  const levels = getOptions();
  const itemsPerPage = 20;
  const onLastPage = (page + 1) >= Math.ceil(numLevels / itemsPerPage);
  const router = useRouter();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      // set stat filter from url
      const url = new URL(window.location.href);
      const statFilter = url.searchParams.get('statFilter');

      if (statFilter) {
        setStatFilter(statFilter as StatFilter);
      }

      return;
    }

    // TODO: rewrite this to use DefaultQuery like the search page
    // update the url with the new page based on the current page and search
    const url = new URL(window.location.href);

    if (page.toString() !== url.searchParams.get('page')) {
      url.searchParams.set('page', page.toString());
    }

    if (filterText !== url.searchParams.get('search')) {
      url.searchParams.set('search', filterText);
    }

    if (statFilter !== url.searchParams.get('statFilter')) {
      url.searchParams.set('statFilter', statFilter.toString());
    }

    if (page === 0) {
      url.searchParams.delete('page');
    }

    if (filterText === '') {
      url.searchParams.delete('search');
    }

    if (statFilter === StatFilter.All) {
      url.searchParams.delete('statFilter');
    }

    // only replace if the url has changed
    if (url.toString() !== window.location.href) {
      router.replace(url.toString());
    }
  }, [page, filterText, router, statFilter]);

  return (<>
    <NextSeo
      title={`${collection.name} - ${game.displayName}`}
      description={collection.authorNote}
      canonical={`${game.baseUrl}/collection/${collection.slug}`}
      openGraph={{
        title: `${collection.name} - ${game.displayName}`,
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
          onChange={() => {
            setPage(0);
          }}
          placeholder={`Search ${numLevels} level${numLevels !== 1 ? 's' : ''}...`}
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
        <div className='flex flex-wrap justify-center gap-4'>
          {levels.map(option => {
            if (!option.level) {
              return null;
            }

            return (
              <LevelCard
                href={`/level/${option.level.slug}?cid=${collection._id}`}
                id='collection'
                key={option.id}
                level={option.level}
              />
            );
          })}
        </div>
      </div>
      <div className='flex flex-row gap-4 text-center justify-center items-center'>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          id='prevPage'
          onClick={() => setPage(page - 1)}
          style={{
            visibility: page === 0 ? 'hidden' : 'visible',
          }}
        >
          Prev
        </button>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          id='nextPage'
          onClick={() => setPage(page + 1)}
          style={{
            visibility: onLastPage ? 'hidden' : 'visible', // TODO: we don't return the total results... so we don't know if there are more pages if it is exactly 5 left
          }}
        >
          Next
        </button>
      </div>
    </Page>
  </>);
}
