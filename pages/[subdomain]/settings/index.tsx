import SettingsAccount from '@root/components/settings/settingsAccount';
import SettingsAccountGuest from '@root/components/settings/settingsAccountGuest';
import SettingsDelete from '@root/components/settings/settingsDelete';
import SettingsNotifications from '@root/components/settings/settingsNotifications';
import isGuest from '@root/helpers/isGuest';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import Page from '../../../components/page/page';
import SettingsGeneral from '../../../components/settings/settingsGeneral';
import { getUserFromToken } from '../../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
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

  return {
    props: {
      user: JSON.parse(JSON.stringify(reqUser)),
    } as SettingsProps,
  };
}

interface SettingsProps {
  user: User;
}

/* istanbul ignore next */
export default function Settings({ user }: SettingsProps) {
  return (
    <Page title='Settings'>
      <div className='mx-4 my-8 gap-8 flex flex-col items-center'>
        <h1 className='font-bold text-3xl text-center'>Settings</h1>
        {isGuest(user) ?
          <SettingsAccountGuest />
          :
          <>
            <SettingsGeneral user={user} />
            <SettingsAccount user={user} />
          </>
        }
        <SettingsNotifications />
        <SettingsDelete />
      </div>
    </Page>
  );
}
