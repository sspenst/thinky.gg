import '../styles/global.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import newrelic from 'newrelic';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ProgressBar from '../components/progressBar';
import { AppContext } from '../contexts/appContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();
  const [shouldAttemptSWR, setShouldAttemptSWR] = useState(true);

  useEffect(() => {
    const shouldAttemptSWRStorage = window.sessionStorage.getItem('shouldAttemptSWR');

    if (shouldAttemptSWRStorage) {
      setShouldAttemptSWR(shouldAttemptSWRStorage === 'true');
    }
    else {
      window.sessionStorage.setItem('shouldAttemptSWR', 'true');
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem('shouldAttemptSWR', String(shouldAttemptSWR));
  }, [shouldAttemptSWR]);

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
      </Head>
      <AppContext.Provider value={{
        setIsLoading: setIsLoading,
        setShouldAttemptSWR: setShouldAttemptSWR,
        shouldAttemptSWR: shouldAttemptSWR,
      }}>
        <ProgressBar isLoading={isLoading} />
        <Toaster toastOptions={{ duration: 1500 }}/>
        <Component {...pageProps} />
      </AppContext.Provider>
    </>
  );
}
