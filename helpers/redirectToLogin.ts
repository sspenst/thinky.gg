import { GetServerSidePropsContext } from 'next';
import { getGameIdFromReq } from './getGameIdFromReq';

export function redirectToLogin(checkFunction: () => boolean, context: GetServerSidePropsContext, props = {}) {
  const gameId = getGameIdFromReq(context.req);

  const redirectParams = new URLSearchParams({
    redirect: context.resolvedUrl,
    gameId: gameId,
  });

  if (checkFunction()) {
    return {
      redirect: {
        destination: `/login${context.resolvedUrl ? '?' + encodeURIComponent(redirectParams.toString()) : ''}`,
        permanent: false,
      },
    };
  }

  return {
    props: props,
  };
}
