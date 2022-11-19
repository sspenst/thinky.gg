import { ObjectId } from 'bson';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import FilterButton from '../../components/filterButton';
import NotificationList from '../../components/notification/notificationList';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';
import { enrichNotifications } from '../../helpers/enrich';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Notification from '../../models/db/notification';
import { NotificationModel } from '../../models/mongoose';

const notificationsPerPage = 10;

type NotificationSearchObjProps = {
  userId: ObjectId;
  read?: boolean;
}

interface SearchQuery {
  filter: string;
  page: number;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const { filter, page } = context.query;
  const searchQuery = {
    filter: typeof filter !== 'string' ? 'all' : filter,
    page: typeof page !== 'string' || isNaN(parseInt(page + '')) ? 1 : parseInt(page),
  } as SearchQuery;

  const searchObj: NotificationSearchObjProps = { userId: reqUser._id };

  if (searchQuery.filter === 'unread') {
    searchObj.read = false;
  }

  const [notifications, totalRows] = await Promise.all([
    NotificationModel.find(searchObj, {}, { sort: { createdAt: -1, _id: -1 }, lean: true, limit: notificationsPerPage, skip: notificationsPerPage * (searchQuery.page - 1) }).populate(['target', 'source']),
    NotificationModel.countDocuments(searchObj),
  ]);
  const enrichedNotifications = await enrichNotifications(notifications as Notification[], reqUser);

  return {
    props: {
      notifications: JSON.parse(JSON.stringify(enrichedNotifications)),
      searchQuery: JSON.parse(JSON.stringify(searchQuery)),
      totalRows: totalRows,
    } as NotificationProps,
  };
}

interface NotificationProps {
    notifications: Notification[];
    searchQuery: SearchQuery;
    totalRows: number;
}

/* istanbul ignore next */
export default function NotificationsPage({ notifications, searchQuery, totalRows }: NotificationProps) {
  const [data, setData] = useState<Notification[]>(notifications);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setData(notifications);
    setLoading(false);
  }, [notifications, setLoading]);

  const fetchNotifications = useCallback((query: SearchQuery) => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = query as any;

    if (query.filter === 'all') {
      delete q.filter;
    }

    if (query.page === 1) {
      delete q.page;
    }

    router.push({
      query: q,
    });
  }, [router, setLoading]);

  const onUnreadFilterButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value;

    fetchNotifications({
      filter: searchQuery.filter === value ? 'all' : value,
      page: 1,
    } as SearchQuery);
  };

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  return (
    <Page title='Notifications'>
      <div className='p-3'>
        <div className='pl-3'>
          <FilterButton selected={searchQuery.filter === 'unread'} value='unread' first last onClick={onUnreadFilterButtonClick} element={<span className='text-sm'>Unread</span>} />
        </div>
        <NotificationList notifications={data} setNotifications={setData} />
        {totalRows > notificationsPerPage &&
          <div className='flex justify-center flex-row'>
            {searchQuery.page > 1 && (
              <button
                className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')}
                onClick={() => fetchNotifications({
                  filter: searchQuery.filter,
                  page: searchQuery.page - 1,
                } as SearchQuery)}
              >
                Previous
              </button>
            )}
            <div id='page-number' className='ml-2'>
              {searchQuery.page} of {Math.ceil(totalRows / notificationsPerPage)}
            </div>
            {totalRows > (searchQuery.page * notificationsPerPage) && (
              <button
                className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')}
                onClick={() => fetchNotifications({
                  filter: searchQuery.filter,
                  page: searchQuery.page + 1,
                } as SearchQuery)}
              >
                Next
              </button>
            )}
          </div>
        }
      </div>
    </Page>
  );
}
