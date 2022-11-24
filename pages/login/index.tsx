import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import React from 'react';
import LoginForm from '../../components/loginForm';
import Page from '../../components/page';
import redirectToHome from '../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function Login() {
  return (
    <Page title={'Log In'}>
      <>
        <LoginForm />
        <div className='text-center text-xs mb-4' style={{ color: 'var(--bg-color-4)' }}>
          {'Hang out in our '}
          <Link href='https://discord.gg/NsN8SBEZGN' className='underline'>
            Discord server
          </Link>
        </div>
        <div className='text-center mb-4'>
          {'New to Pathology? '}
          <Link href='/signup' passHref className='underline'>
            Sign Up
          </Link>
          <br />
        </div>
      </>
    </Page>
  );
}
