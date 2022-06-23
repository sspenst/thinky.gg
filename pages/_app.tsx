import '../styles/global.css';
import React, { useState } from 'react';
import { AppContext } from '../contexts/appContext';
import type { AppProps } from 'next/app';
import ProgressBar from '../components/progressBar';
import { Toaster } from 'react-hot-toast';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [isLoading, setIsLoading] = useState<boolean>();

  return (
    <AppContext.Provider value={{
      setIsLoading: setIsLoading,
    }}>
      <ProgressBar isLoading={isLoading} />
      <Toaster toastOptions={{ duration: 1500 }}/>
      <Component {...pageProps} />
    </AppContext.Provider>
  );
}
