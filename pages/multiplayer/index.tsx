import PagePath from '@root/constants/pagePath';
import { AppContext } from '@root/contexts/appContext';
import { useTour } from '@root/hooks/useTour';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';
import Multiplayer from '../../components/multiplayer/multiplayer';
import Page from '../../components/page/page';
import { getUserFromToken } from '../../lib/withAuth';

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

  return {
    props: {},
  };
}

/* istanbul ignore next */
export default function MultiplayerPage() {
  const { game } = useContext(AppContext);
  const tour = useTour(PagePath.MULTIPLAYER);

  return (
    <Page title='Multiplayer'>
      <>
        <NextSeo
          title={'Multiplayer - ' + game.displayName}
          description={'Play ' + game.displayName + ' in real time against other players'}
          canonical={`https://${game.baseUrl}/multiplayer`}
        />
        {tour}
        <Multiplayer />
      </>
    </Page>
  );
}
