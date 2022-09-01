import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import FilterButton from '../../components/filterButton';
import NotificationList from '../../components/notification/notificationList';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';
import { enrichNotifications } from '../../helpers/enrich';
import usePush from '../../hooks/usePush';
import useUser from '../../hooks/useUser';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Notification from '../../models/db/notification';
import { NotificationModel } from '../../models/mongoose';

const perPage = 10;

type NotificationSearchObjProps = {
  userId: ObjectId;
  read?: boolean;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  let { page, filter } = context.query;

  if (!page || isNaN(parseInt(page + ''))) {
    page = '1';
  }

  if (!filter || typeof filter !== 'string') {
    filter = 'all';
  }

  const searchObj: NotificationSearchObjProps = { userId: reqUser._id };

  if (filter === 'unread') {
    searchObj['read'] = false;
  }

  const [notifications, totalRows] = await Promise.all([
    NotificationModel.find(searchObj, {}, { sort: [ { createdAt: -1 }, { _id: -1 } ], lean: true, limit: perPage, skip: perPage * (parseInt(page + '') - 1) }).populate(['target', 'source']),
    NotificationModel.find(searchObj, {}, { lean: true }).countDocuments(),
  ]);
  const enrichedNotifications = await enrichNotifications(notifications as Notification[], reqUser);

  return {
    props: {
      notifications: JSON.parse(JSON.stringify(enrichedNotifications)),
      totalRows: totalRows,
      searchQuery: { page: page, showFilter: filter }
    } as NotificationProps,
  };
}

interface NotificationProps {
    notifications: Notification[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchQuery: Record<string, any>;
    totalRows: number;
}

/* istanbul ignore next */
export default function Notifications({ notifications, searchQuery, totalRows }: NotificationProps) {
  const firstLoad = useRef(true);
  const [data, setData] = useState<Notification[]>(notifications);
  const [loading, setLoading] = useState(false);
  const { mutateUser } = useUser();
  const [page, setPage] = useState(searchQuery.page || 1);
  const router = useRouter();
  const routerPush = usePush();
  const { setIsLoading } = useContext(AppContext);
  const [showFilter, setShowFilter] = useState(searchQuery.showFilter || 'all');
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));

  const fetchNotifications = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    //firstLoad.current = true;
    // this url but strip any query params
    const url_until_query = url.split('?')[0];
    const routerUrl = url_until_query + '?page=' + encodeURIComponent(page) + '&filter=' + encodeURIComponent(showFilter);

    setUrl(routerUrl);
  }, [page, showFilter, url]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setData(notifications);
    setLoading(false);
  }, [notifications]);

  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  useEffect(() => {
    setPage(searchQuery.page ? parseInt(searchQuery.page as string) : 1);
  }, [searchQuery]);

  const onUnreadFilterButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.value;

    setShowFilter(showFilter === value ? 'all' : value);
  };

  return (
    <Page title='Notifications'>
      <div className='p-3'>
        <div className='pl-3'>
          <FilterButton selected={showFilter === 'unread'} value='unread' first last onClick={onUnreadFilterButtonClick} element={<span className='text-sm'>Unread</span>} />
        </div>
        <NotificationList mutateNotifications={mutateUser} notifications={data} setNotifications={setData} />
        <div className='flex justify-center flex-row'>
          { (page > 1) && (
            <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page - 1) }>Previous</button>
          )}
          <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / perPage)}</div>
          { totalRows > (page * perPage) && (
            <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page + 1) }>Next</button>
          )}
        </div>
      </div>
    </Page>
  );
}
