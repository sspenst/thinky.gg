import SignupFormWizard from '@root/components/forms/signupFormWizard';
import GameLogoAndLabel from '@root/components/gameLogoAndLabel';
import { GameId } from '@root/constants/GameId';
import { getUserFromToken } from '@root/lib/withAuth';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
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
    props: {
    },
  };
}

/* istanbul ignore next */
export default function SignUp() {
  return (
    <Page title={'Sign Up'}>
      <>
        <div className='w-full max-w-md mx-auto mt-3 justify-center text-center'>
          <div className='flex flex-col gap-2 items-center'>
            <div className='text-2xl flex items-center gap-4'>
              <GameLogoAndLabel gameId={GameId.THINKY} id='signup' />
            </div>
            <div>Create a Thinky.gg account and start playing!</div><div>Your Thinky.gg account works across all games on the site.</div>
          </div>
        </div>
        <SignupFormWizard />
        <div className='flex flex-col gap-4 items-center'>
          <div className='flex flex-wrap items-center justify-between'>
            <Link
              className='inline-block align-baseline font-bold text-sm hover:text-blue-400'
              href='/play-as-guest'
            >
            Play as Guest
            </Link>
          </div>
          <div className='text-center mb-4'>
            {'Already have an account? '}
            <Link href='/login' passHref className='underline'>
            Log In
            </Link>

          </div>

        </div>
      </>
    </Page>
  );
}
