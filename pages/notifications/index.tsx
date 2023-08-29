import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';
import React, { useCallback, useEffect, useState } from 'react';
import FilterButton from '../../components/buttons/filterButton';
import NotificationList from '../../components/notification/notificationList';
import Page from '../../components/page/page';
import { enrichNotifications } from '../../helpers/enrich';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Notification from '../../models/db/notification';
import { NotificationModel } from '../../models/mongoose';

const notificationsPerPage = 20;

type NotificationSearchObjProps = {
  userId: Types.ObjectId;
  read?: boolean;
}

interface SearchQuery extends ParsedUrlQuery {
  filter: string;
  page: string;
}

const DefaultQuery = {
  filter: 'all',
  page: '1',
} as SearchQuery;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  const { filter, page } = context.query;
  const searchQuery = {
    filter: typeof filter !== 'string' ? DefaultQuery.filter : filter,
    page: typeof page !== 'string' || isNaN(parseInt(page + '')) ? DefaultQuery.page : parseInt(page),
  } as SearchQuery;

  const searchObj: NotificationSearchObjProps = { userId: reqUser._id };

  if (searchQuery.filter === 'unread') {
    searchObj.read = false;
  }

  const [notifications, totalRows] = await Promise.all([
    NotificationModel.find(searchObj, {}, { sort: { createdAt: -1 }, lean: true, limit: notificationsPerPage, skip: notificationsPerPage * (Number(searchQuery.page) - 1) }).populate(['target', 'source']),
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
  const [data, setData] = useState(notifications);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setData(notifications);
    setLoading(false);
  }, [notifications, setLoading]);

  const fetchNotifications = useCallback((query: SearchQuery) => {
    setLoading(true);

    // only add non-default query params for a clean URL
    const q: ParsedUrlQueryInput = {};

    for (const prop in query) {
      if (query[prop] !== DefaultQuery[prop]) {
        q[prop] = query[prop];
      }
    }

    router.push({
      query: q,
    });
  }, [router, setLoading]);

  const onUnreadFilterButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value;

    fetchNotifications({
      filter: searchQuery.filter === value ? DefaultQuery.filter : value,
      page: DefaultQuery.page,
    } as SearchQuery);
  };

  const page = Number(searchQuery.page);

  return (
    <Page title='Notifications'>
      <div className='flex justify-center max-w-xl mx-auto'>
        <div className='p-3 w-full'>
          <div className='flex justify-center'>
            <FilterButton selected={searchQuery.filter === 'unread'} value='unread' first last onClick={onUnreadFilterButtonClick} element={<span className='text-sm'>Unread</span>} />
          </div>
          <NotificationList notifications={data} setNotifications={setData} />
          {totalRows > notificationsPerPage &&
            <div className='flex justify-center flex-row'>
              {page > 1 && (
                <button
                  className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')}
                  onClick={() => fetchNotifications({
                    filter: searchQuery.filter,
                    page: String(page - 1),
                  } as SearchQuery)}
                >
                  Previous
                </button>
              )}
              <div id='page-number' className='ml-2'>
                {page} of {Math.ceil(totalRows / notificationsPerPage)}
              </div>
              {totalRows > (page * notificationsPerPage) && (
                <button
                  className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')}
                  onClick={() => fetchNotifications({
                    filter: searchQuery.filter,
                    page: String(page + 1),
                  } as SearchQuery)}
                >
                  Next
                </button>
              )}
            </div>
          }
        </div>
      </div>
    </Page>
  );
}
