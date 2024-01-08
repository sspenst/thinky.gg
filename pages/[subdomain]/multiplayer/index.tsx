import { AppContext } from '@root/contexts/appContext';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';
import Multiplayer from '../../../components/multiplayer/multiplayer';
import Page from '../../../components/page/page';
import { getUserFromToken } from '../../../lib/withAuth';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req as NextApiRequest);
  const game = getGameFromId(gameId);

  if (game.disableMultiplayer) {
    return {
      props: undefined,
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  if (!reqUser) {
    return redirectToLogin(context);
  }

  return {
    props: {
    },
  };
}

/* istanbul ignore next */
export default function MultiplayerPage() {
  const { game } = useContext(AppContext);

  return (
    <Page title='Multiplayer'>
      <>
        <NextSeo
          title={'Multiplayer - ' + game.displayName}
          description={'Play ' + game.displayName + ' in real time against other players'}
          canonical={`${game.baseUrl}/multiplayer`}
        />
        <Multiplayer />
      </>
    </Page>
  );
}
