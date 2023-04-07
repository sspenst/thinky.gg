import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import React from 'react';
import Page from '../../components/page';
import SignupForm from '../../components/signupForm';
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
        <div
          style={{
            margin: '0 auto',
            display: 'table',
          }}
        >
          {'Already have an account? '}
          <Link href='/login' passHref className='underline'>
            Log In
          </Link>
        </div>

        <div className='p-6  text-center text-sm'
          style={{

          }}
        >
          {'For Psychopath 2 users signing up on Pathology: If your email was public on the old site you may get a password reset link when you use the same email to sign up. If your email wasn\'t public or you\'re having any issues signing up, send @sspenst a message on the '}
          <a
            className='underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          {' and we can merge your accounts manually.'}
        </div>
      </>
    </Page>
  );
}
