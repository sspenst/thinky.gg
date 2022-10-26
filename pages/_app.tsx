/* istanbul ignore file */

import '../styles/global.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { DefaultSeo, NextSeo } from 'next-seo';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ProgressBar from '../components/progressBar';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();
  const { isLoading: userLoading, mutateUser, user } = useUser();
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);

  // initialize shouldAttemptAuth if it exists in sessionStorage
  useEffect(() => {
    const shouldAttemptAuthStorage = window.sessionStorage.getItem('shouldAttemptAuth');

    if (shouldAttemptAuthStorage) {
      setShouldAttemptAuth(shouldAttemptAuthStorage === 'true');
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem('shouldAttemptAuth', String(shouldAttemptAuth));
  }, [shouldAttemptAuth]);

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
      </Head>
      <DefaultSeo
        defaultTitle='Pathology'
        description='The goal of the puzzle game Pathology is simple. Get to the exit in the least number of moves.'
        canonical='https://pathology.gg/'
        twitter={{
          handle: '@pathologygame',
          site: 'https://pathology.gg',
          cardType: 'summary_large_image'
        }}
      />
      <NextSeo
        openGraph={{
          title: 'Pathology',
          description: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route',
          images: [
            {
              url: 'https://pathology.gg/api/level/image/61fe3c372cdc920ef6f80190.png',
              width: 512,
              height: 512,
              alt: 'Pathology Logo'
            }
          ],
          site_name: 'Pathology'
        }}
      />
      <AppContext.Provider value={{
        mutateUser: mutateUser,
        setIsLoading: setIsLoading,
        setShouldAttemptAuth: setShouldAttemptAuth,
        shouldAttemptAuth: shouldAttemptAuth,
        user: user,
        userConfig: user?.config,
        userLoading: userLoading,
      }}>
        <ProgressBar isLoading={isLoading} />
        <Toaster toastOptions={{ duration: 1500 }} />
        <Component {...pageProps} />
      </AppContext.Provider>
    </>
  );
}
