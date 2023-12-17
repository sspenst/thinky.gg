import { GameId } from '@root/constants/GameId';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { getUserFromToken } from '../lib/withAuth';
import { getGameIdFromReq } from './getGameIdFromReq';

// if logged in, redirect to home page
export default async function redirectToHome(context: GetServerSidePropsContext, props = {}) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  if (reqUser && gameId !== GameId.THINKY) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: props,
  };
}
