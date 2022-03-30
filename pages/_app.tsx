import '../styles/global.css';
import React, { useState } from 'react';
import { AppContext } from '../contexts/appContext';
import type { AppProps } from 'next/app';
import ProgressBar from '../components/progressBar';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();

  return (
    <AppContext.Provider value={{
      setIsLoading: setIsLoading,
    }}>
      <ProgressBar isLoading={isLoading} />
      <Component {...pageProps} />
    </AppContext.Provider>
  );
}
