import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { getUserFromToken } from '../lib/withAuth';

// if not logged in, redirect to login page
export default async function redirectToLogin(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
