import type { AppProps } from 'next/app';
import '../components/index.css';
import React from 'react';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
