import LevelCard from '@root/components/cards/levelCard';
import FormattedDate from '@root/components/formatted/formattedDate';
import TimeRange from '@root/constants/timeRange';
import { blueButton } from '@root/helpers/className';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import classNames from 'classnames';
import debounce from 'debounce';
import { FilterQuery } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQueryInput } from 'querystring';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { LevelModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const game = getGameFromId(gameId);
  const pageParam = context.query?.page ? parseInt(context.query.page as string) : 1;
  const page = isNaN(pageParam) ? 1 : pageParam;
  const levelsPerPage = 50;
  const search = (context.query?.search as string) || '';
  const sortBy = (context.query?.sortBy as string) || 'date';

  if (game.isNotAGame) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  if (!reqUser) {
    return redirectToLogin(context);
  }

  // Build search query
  const searchQuery: FilterQuery<Level> = {
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
    gameId: gameId
  };

  // Add name search filter if search term is provided
  if (search) {
    searchQuery.name = { $regex: search, $options: 'i' };
  }

  // Get total count of draft levels with search filter
  const totalCount = await LevelModel.countDocuments(searchQuery);
  // Build sort criteria based on sortBy parameter
  let levels: Level[];

  if (sortBy === 'name') {
    // Use separate queries approach - much faster than $lookup
    // Get levels without lookup first
    levels = await LevelModel.aggregate<Level>([
      { $match: searchQuery },
      { $sort: { name: 1, _id: 1 } },
      { $skip: (page - 1) * levelsPerPage },
      { $limit: levelsPerPage }
    ]);
    
    // Find which levels have scheduled messages and get those messages in a separate query
    const scheduledLevelIds = levels
      .filter(level => level.scheduledQueueMessageId)
      .map(level => level.scheduledQueueMessageId);
    
    let queueMessages: any[] = [];
    if (scheduledLevelIds.length > 0) {
      const { QueueMessageModel } = await import('../../../models/mongoose');
      queueMessages = await QueueMessageModel.find({
        _id: { $in: scheduledLevelIds }
      }).lean();
    }
    
    // Attach queue messages to levels
    const queueMessageMap = new Map(queueMessages.map(msg => [msg._id.toString(), msg]));
    levels.forEach(level => {
      if (level.scheduledQueueMessageId) {
        (level as any).scheduledQueueMessage = queueMessageMap.get(level.scheduledQueueMessageId.toString());
      }
    });
  } else {
    // Use separate queries approach for date sorting too
    // Get levels without lookup first
    levels = await LevelModel.aggregate<Level>([
      { $match: searchQuery },
      {
        $addFields: {
          sortDate: {
            $ifNull: ['$updatedAt', { $toDate: { $multiply: ['$ts', 1000] } }]
          }
        }
      },
      { $sort: { sortDate: -1, _id: -1 } },
      { $skip: (page - 1) * levelsPerPage },
      { $limit: levelsPerPage },
      { $unset: 'sortDate' }
    ]);
    
    // Find which levels have scheduled messages and get those messages in a separate query
    const scheduledLevelIds = levels
      .filter(level => level.scheduledQueueMessageId)
      .map(level => level.scheduledQueueMessageId);
    
    let queueMessages: any[] = [];
    if (scheduledLevelIds.length > 0) {
      const { QueueMessageModel } = await import('../../../models/mongoose');
      queueMessages = await QueueMessageModel.find({
        _id: { $in: scheduledLevelIds }
      }).lean();
    }
    
    // Attach queue messages to levels
    const queueMessageMap = new Map(queueMessages.map(msg => [msg._id.toString(), msg]));
    levels.forEach(level => {
      if (level.scheduledQueueMessageId) {
        (level as any).scheduledQueueMessage = queueMessageMap.get(level.scheduledQueueMessageId.toString());
      }
    });
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      user: JSON.parse(JSON.stringify(reqUser)),
      page: page,
      totalCount: totalCount,
      levelsPerPage: levelsPerPage,
      search: search,
      sortBy: sortBy,
    },
  };
}

export interface CreatePageProps {
  levels: Level[];
  user: User;
  page: number;
  totalCount: number;
  levelsPerPage: number;
  search: string;
  sortBy: string;
}

type SortOption = 'name' | 'date';

interface RouterQuery extends ParsedUrlQueryInput {
  page?: string;
  search?: string;
  sortBy?: string;
}

/* istanbul ignore next */
export default function Create({ levels, user, page, totalCount, levelsPerPage, search, sortBy }: CreatePageProps) {
  const [searchText, setSearchText] = useState(search);
  const [localLevels, setLocalLevels] = useState(levels);
  const router = useRouter();

  // Use the server-provided sortBy value directly
  const currentSort = sortBy as SortOption;

  // Get the correct pathname for subdomain-aware routing
  const pathname = router.pathname.replace('/[subdomain]', '');

  // Sync state with props when they change
  useEffect(() => {
    setSearchText(search);
  }, [search]);

  useEffect(() => {
    setLocalLevels(levels);
  }, [levels]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchTextDebounce = useCallback(
    debounce((searchTerm: string) => {
      const query: RouterQuery = {};

      // Always set page to 1 when searching
      query.page = '1';

      if (searchTerm) {
        query.search = searchTerm;
      }

      // Preserve current sort
      if (currentSort !== 'date') {
        query.sortBy = currentSort;
      }

      // Remove subdomain from query as it's handled by the pathname
      delete query.subdomain;

      router.replace({
        pathname: pathname,
        query: query,
      });
    }, 500), [currentSort, pathname]);

  const handleSortChange = (newSortBy: SortOption) => {
    const query: RouterQuery = {
      page: '1', // Reset to page 1 when changing sort
    };

    if (searchText) {
      query.search = searchText;
    }

    if (newSortBy !== 'date') {
      query.sortBy = newSortBy;
    }

    // Remove subdomain from query as it's handled by the pathname
    delete query.subdomain;

    router.replace({
      pathname: pathname,
      query: query,
    });
  };

  const cancelScheduledPublish = async (levelId: string) => {
    try {
      toast.loading('Canceling scheduled publish...');

      const response = await fetch(`/api/schedule-publish/${levelId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Scheduled publish canceled');

        // Update the level in local state
        setLocalLevels(prevLevels =>
          prevLevels.map(level =>
            level._id.toString() === levelId
              ? { ...level, scheduledQueueMessageId: undefined }
              : level
          )
        );
      } else {
        const error = await response.json();

        toast.dismiss();
        toast.error(error.error || 'Failed to cancel scheduled publish');
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Error canceling scheduled publish');
    }
  };

  // Since sorting is now done server-side, we don't need client-side sorting
  // Use local levels to reflect any updates from canceling scheduled publishes
  const sortedLevels = localLevels;

  const totalPages = Math.ceil(totalCount / levelsPerPage);

  return (
    <Page title='Drafts'>
      <div className='flex flex-col gap-5 m-5 items-center'>
        <h1 className='text-3xl font-bold text-center'>
          Your Draft Levels
        </h1>
        <ul>
          <li>Create a new level and save your changes</li>
          <li><span className='font-bold'>Test</span> your level to set a step count</li>
          <li><span className='font-bold'>Publish</span> your level for everyone to play!</li>
          <li>You can unpublish or archive a level at any time</li>
        </ul>
        <div className='flex items-center flex-wrap justify-center gap-4'>
          <Link
            className={classNames('flex items-center gap-2', blueButton)}
            href='/create'
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='2 2 20 20' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
            <span>Create Level</span>
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={{
              pathname: '/search',
              query: {
                searchAuthor: user.name,
                sortBy: 'ts',
                timeRange: TimeRange[TimeRange.All],
              },
            }}
          >
            Your Published Levels
          </Link>
          <Link
            className='py-2 px-4 rounded-lg hover:bg-neutral-500'
            href={`/profile/${user.name}/collections`}
          >
            Your Collections
          </Link>
        </div>
        {/* Search */}
        <div className='flex justify-center'>
          <div className='p-2'>
            <input
              aria-label='Search draft levels'
              id='search-drafts'
              onChange={e => {
                setSearchText(e.target.value);
                setSearchTextDebounce(e.target.value);
              }}
              placeholder={`Search ${totalCount} draft level${totalCount !== 1 ? 's' : ''}...`}
              type='search'
              value={searchText}
              className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
        </div>
        {/* Sort Controls */}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>Sort by:</span>
          <button
            onClick={() => handleSortChange('name')}
            className={classNames(
              'px-3 py-1 rounded-md text-sm transition-colors',
              currentSort === 'name'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            )}
          >
            Name
          </button>
          <button
            onClick={() => handleSortChange('date')}
            className={classNames(
              'px-3 py-1 rounded-md text-sm transition-colors',
              currentSort === 'date'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            )}
          >
            Last Modified
          </button>
        </div>
        
        <div className='flex flex-wrap justify-center gap-4'>
          {sortedLevels.map(level => {
            const isScheduled = level.scheduledQueueMessageId;
            const scheduledMessage = (level as any).scheduledQueueMessage;
            const publishDate = scheduledMessage?.runAt ? new Date(scheduledMessage.runAt) : null;

            return (
              <div key={`draft-level-div-${level._id.toString()}`} className='flex flex-col'>
                <div className='relative'>
                  <LevelCard
                    href={isScheduled ? undefined : `/edit/${level._id.toString()}`}
                    id='draft-level'
                    key={`draft-level-${level._id.toString()}`}
                    level={level}
                  />
                  {isScheduled && (
                    <div className='absolute inset-0 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center'>
                      <div className='bg-blue-600 text-white p-2 rounded-lg text-center'>
                        <div className='flex items-center gap-1 text-sm font-medium'>
                          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.89-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' />
                          </svg>
                          Scheduled
                        </div>
                        {publishDate && (
                          <div className='text-xs mt-1'>
                            {publishDate.toLocaleDateString()} at {publishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className='text-center mt-1'>
                  <FormattedDate prefix='Updated' date={level?.updatedAt} className='italic text-xs block' />
                  {isScheduled && (
                    <div className='flex gap-2 justify-center mt-2'>
                      <div
                        onClick={() => cancelScheduledPublish(level._id.toString())}
                        className='text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded cursor-pointer'
                        role='button'
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            cancelScheduledPublish(level._id.toString());
                          }
                        }}
                      >
                        Cancel Schedule
                      </div>
                      <span className='text-xs text-gray-400 flex items-center gap-1'>
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'>
                          <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
                        </svg>
                        Cannot edit while scheduled
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Pagination */}
        {totalCount > levelsPerPage && (
          <div className='flex justify-center flex-row'>
            {page > 1 && (
              <Link
                className='ml-2 underline'
                href={{
                  pathname: pathname,
                  query: {
                    ...(page !== 2 && { page: page - 1 }),
                    ...(searchText && { search: searchText }),
                    ...(currentSort !== 'date' && { sortBy: currentSort }),
                  }
                }}
              >
                Previous
              </Link>
            )}
            <div id='page-number' className='ml-2'>{page} of {totalPages}</div>
            {totalCount > (page * levelsPerPage) && (
              <Link
                className='ml-2 underline'
                href={{
                  pathname: pathname,
                  query: {
                    page: page + 1,
                    ...(searchText && { search: searchText }),
                    ...(currentSort !== 'date' && { sortBy: currentSort }),
                  }
                }}
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
