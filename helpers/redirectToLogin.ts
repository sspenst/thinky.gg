import { GetServerSidePropsContext } from 'next';
import { getGameIdFromReq } from './getGameIdFromReq';

export function redirectToLogin(context: GetServerSidePropsContext) {
  const gameId = getGameIdFromReq(context.req);

  const redirectParams = new URLSearchParams({
    redirect: context.resolvedUrl,
    gameId: gameId,
  });

  const redirectParamsString = redirectParams.toString(); // ?redirect=...&gameId=...

  return {
    redirect: {
      destination: `/login${context.resolvedUrl ? '?' + encodeURIComponent(redirectParamsString) : ''}`,
      permanent: false,
    },
  };
}
