import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { getUserFromToken } from '../lib/withAuth';

// if logged in, redirect to home page
export default async function redirectToHome(context: GetServerSidePropsContext, props = {}) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (reqUser) {
    return {
      redirect: {
        destination: '/home',
        permanent: false,
      },
    };
  }

  return {
    props: props,
  };
}
