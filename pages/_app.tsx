/* istanbul ignore file */

import '../styles/global.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ProgressBar from '../components/progressBar';
import { AppContext } from '../contexts/appContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();
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
      <AppContext.Provider value={{
        setIsLoading: setIsLoading,
        setShouldAttemptAuth: setShouldAttemptAuth,
        shouldAttemptAuth: shouldAttemptAuth,
      }}>
        <ProgressBar isLoading={isLoading} />
        <Toaster toastOptions={{ duration: 1500 }} />
        <Component {...pageProps} />
      </AppContext.Provider>
    </>
  );
}
