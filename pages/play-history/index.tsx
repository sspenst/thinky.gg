import Page from '@root/components/page/page';
import ProfilePlayHistory from '@root/components/profile/playHistory';
import isPro from '@root/helpers/isPro';
import { getUserFromToken } from '@root/lib/withAuth';
import User from '@root/models/db/user';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';

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
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    },
  };
}

interface PlayHistoryPageProps {
  reqUser: User;
}

export default function PlayHistoryPage({ reqUser }: PlayHistoryPageProps): JSX.Element {
  return (
    <Page hideFooter title='Play History'>
      {isPro(reqUser) ?
        <ProfilePlayHistory />
        :
        <div className='text-center text-lg break-words p-3'>
          Get <Link href='/settings/proaccount' className='text-blue-500 hover:text-blue-300 transition'>
            Pathology Pro
          </Link> to view your play history.
        </div>
      }
    </Page>
  );
}
