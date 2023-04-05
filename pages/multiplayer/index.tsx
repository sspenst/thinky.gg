import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo } from 'next-seo';
import React from 'react';
import Multiplayer from '../../components/multiplayer';
import Page from '../../components/page';
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
  return (
    <Page title='Multiplayer'>
      <>
        <NextSeo
          title={'Multiplayer - Pathology'}
          description={'Play Pathology in real time against other players'}
          canonical='https://pathology.gg/multiplayer'
        />
        <Multiplayer />
      </>
    </Page>
  );
}
