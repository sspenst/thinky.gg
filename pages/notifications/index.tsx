import { GetServerSidePropsContext } from 'next';
import React from 'react';
import NotificationList from '../../components/notification/notificationList';
import Page from '../../components/page';
import { enrichNotifications } from '../../helpers/enrich';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Notification from '../../models/db/notification';
import User from '../../models/db/user';
import { NotificationModel } from '../../models/mongoose';

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

  const notifications = await NotificationModel.find({ userId: reqUser._id }, {}, { sort: { createdAt: -1 }, lean: true }).populate(['target', 'source']);
  const enrichedNotifications = await enrichNotifications(notifications as Notification[], reqUser);

  return {
    props: {
      myUser: JSON.parse(JSON.stringify(reqUser)),
      notifications: JSON.parse(JSON.stringify(enrichedNotifications)),
    } as NotificationProps,
  };
}

interface NotificationProps {
    myUser: User
    notifications: Notification[];
}

export default function Notifications({ myUser, notifications }: NotificationProps) {
  return <Page title='Notifications'>
    <div className='p-3'>
      <NotificationList notifications={notifications} />
    </div>
  </Page>;
}
