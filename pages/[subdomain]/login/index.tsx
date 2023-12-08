import { GameId } from '@root/constants/GameId';
import { getGameLogoAndLabel } from '@root/helpers/getGameLogo';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import React from 'react';
import LoginForm from '../../../components/forms/loginForm';
import Page from '../../../components/page/page';
import redirectToHome from '../../../helpers/redirectToHome';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToHome(context);
}

/* istanbul ignore next */
export default function Login() {
  return (
    <Page title={'Log In'}>
      <>
        <div className='w-full max-w-md mx-auto mt-3 justify-center text-center'>
          <div className='flex flex-col gap-2 items-center'>
            <div className='text-2xl items-center self-center'>{getGameLogoAndLabel(GameId.THINKY, 'login')}</div>
            <div>Login with your Thinky.gg account</div>
          </div>
        </div>
        <LoginForm />
        <div className='text-center text-xs mb-4' style={{ color: 'var(--bg-color-4)' }}>
          {'Hang out in our '}
          <Link href='https://discord.gg/NsN8SBEZGN' className='underline'>
            Discord server
          </Link>
        </div>
        <div className='text-center mb-4'>
          {'New to Thinky.gg? '}
          <Link href='/signup' passHref className='underline'>
            Sign Up
          </Link>
          <br />
        </div>
      </>
    </Page>
  );
}
