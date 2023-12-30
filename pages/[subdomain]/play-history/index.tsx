import Page from '@root/components/page/page';
import PlayHistory from '@root/components/profile/playHistory';
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

/* istanbul ignore next
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/
export default function PlayHistoryPage({ reqUser }: PlayHistoryPageProps): JSX.Element {
  const { game } = useContext(AppContext);

  return (
    <Page hideFooter title='Play History'>
      {isPro(reqUser) ?
        <PlayHistory />
        :
        <div className='text-center text-lg break-words p-3 flex flex-col gap-4'>
          <h1 className='text-center text-2xl font-bold'>Play History</h1>
          <span>Get <Link href='/settings/pro' className='text-blue-500 hover:text-blue-300 transition'>
            {game.displayName} Pro
          </Link> to view your play history.</span>
        </div>
      }
    </Page>
  );
}
