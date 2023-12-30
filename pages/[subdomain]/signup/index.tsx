import GameLogoAndLabel from '@root/components/gameLogoAndLabel';
import { GameId } from '@root/constants/GameId';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import React from 'react';
import SignupForm from '../../../components/forms/signupForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await redirectToHome(context);

  if (redirect.redirect) {
    return redirect;
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY || '',
    },
  };
}
/* istanbul ignore next
// Newline placeholder needed for swc: https://github.com/swc-project/jest/issues/119#issuecomment-1872581999
*/

export default function SignUp({ recaptchaPublicKey }: {recaptchaPublicKey?: string}) {
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
        <SignupForm recaptchaPublicKey={recaptchaPublicKey} />
        <div className='text-center mb-4'>
          {'Already have an account? '}
          <Link href='/login' passHref className='underline'>
            Log In
          </Link>
        </div>
      </>
    </Page>
  );
}
