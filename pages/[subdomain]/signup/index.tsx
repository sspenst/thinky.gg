import SignupForm from '@root/components/forms/signupForm';
import { getUserFromToken } from '@root/lib/withAuth';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import Page from '../../../components/page/page';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

/* istanbul ignore next */
export default function SignUp() {
  return (
    <Page title='Sign Up'>
      <SignupForm />
    </Page>
  );
}
