import Page from '@root/components/page/page';
import ProfilePlayHistory from '@root/components/profile/playHistory';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useContext } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    // redirect to login page
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  if (!isPro(reqUser)) {
    return {
      redirect: {
        destination: '/settings/proaccount',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function PlayHistoryPage(): JSX.Element {
  const { user } = useContext(AppContext);

  if (!user) {
    return <Page title='Must be logged in'><div className='p-3 text-center'>You must be logged in to access this page.</div></Page>;
  }

  if (!isPro(user)) {
    return (
      <div className='text-center text-lg break-words'>
        Get <Link href='/settings/proaccount' className='text-blue-300'>
          Pathology Pro
        </Link> to unlock your play history
      </div>
    );
  }

  return (
    <Page hideFooter title={user.name + ' Play History'}>
      <div className='p-3'>
        <ProfilePlayHistory user={user as User} />
      </div>
    </Page>
  );
}
