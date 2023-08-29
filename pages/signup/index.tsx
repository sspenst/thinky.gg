import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import React from 'react';
import Page from '../../components/page/page';
import SignupForm from '../../components/forms/signupForm';
import redirectToHome from '../../helpers/redirectToHome';

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
/* istanbul ignore next */

export default function SignUp({ recaptchaPublicKey }: {recaptchaPublicKey?: string}) {
  return (
    <Page title={'Sign Up'}>
      <>
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
