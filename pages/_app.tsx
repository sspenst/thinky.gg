/* istanbul ignore file */

import '../styles/global.css';
import type { AppProps } from 'next/app';
import { Rubik, Teko } from 'next/font/google';
import Head from 'next/head';
import Router from 'next/router';
import { DefaultSeo } from 'next-seo';
import NProgress from 'nprogress';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import isTheme from '../helpers/isTheme';
import useMultiplayerSocket from '../hooks/useMultiplayerSocket';
import useUser from '../hooks/useUser';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const forceUpdate = useForceUpdate();
  const { isLoading, mutateUser, user } = useUser();
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  const multiplayerSocket = useMultiplayerSocket(!!user);

  // initialize shouldAttemptAuth if it exists in sessionStorage
  useEffect(() => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    const shouldAttemptAuthStorage = window.sessionStorage.getItem('shouldAttemptAuth');

    if (shouldAttemptAuthStorage) {
      setShouldAttemptAuth(shouldAttemptAuthStorage === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('shouldAttemptAuth', String(shouldAttemptAuth));
  }, [shouldAttemptAuth]);

  Router.events.on('routeChangeStart', () => NProgress.start());
  Router.events.on('routeChangeComplete', () => NProgress.done());
  Router.events.on('routeChangeError', () => NProgress.done());

  useEffect(() => {
    if (!user?.config) {
      return;
    }

    if (Object.values(Theme).includes(user.config.theme) && !isTheme(user.config.theme)) {
      // need to remove the default theme so we can add the userConfig theme
      document.body.classList.remove(Theme.Modern);
      document.body.classList.add(user.config.theme);
      forceUpdate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.config]);

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
        <meta name="apple-itunes-app" content="app-id=1668925562, app-argument=pathology.gg" />
      </Head>
      <DefaultSeo
        defaultTitle='Pathology - Shortest Path Puzzle Game'
        description='The goal of the puzzle game Pathology is simple. Get to the exit in the least number of moves.'
        canonical='https://pathology.gg/'
        openGraph={{
          type: 'website',
          url: 'https://pathology.gg',
          siteName: 'Pathology',
        }}
        twitter={{
          handle: '@pathologygame',
          site: 'https://pathology.gg',
          cardType: 'summary_large_image'
        }}
      />
      <AppContext.Provider value={{
        forceUpdate: forceUpdate,
        multiplayerSocket: multiplayerSocket,
        mutateUser: mutateUser,
        setShouldAttemptAuth: setShouldAttemptAuth,
        shouldAttemptAuth: shouldAttemptAuth,
        user: user,
        userConfig: user?.config,
        userLoading: isLoading,
      }}>
        <main className={rubik.className}>
          <Toaster toastOptions={{ duration: 1500 }} />
          <Component {...pageProps} />
        </main>
      </AppContext.Provider>
    </>
  );
}
