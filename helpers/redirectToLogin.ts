import { GetServerSidePropsContext } from 'next';

export function redirectToLogin(context: GetServerSidePropsContext) {
  const redirect = context.resolvedUrl ? context.req.url as string : undefined;

  return {
    redirect: {
      destination: `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`,
      permanent: false,
    },
  };
}
