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
import { AppContext } from '../contexts/appContext';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });

export default function MyApp({ Component, pageProps }: AppProps) {
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  // check for window.originalPostMessage according to https://stackoverflow.com/questions/44843064/determine-if-running-inside-a-react-native-webview

  // initialize shouldAttemptAuth if it exists in sessionStorage
  useEffect(() => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    const isInMobileWebView = typeof window !== 'undefined' && typeof (window as any).originalPostMessage !== 'undefined';

    if (isInMobileWebView) {
      // TODO - Try and hide the banner?
      // set html tag marginTop to inherit

      const html = document.querySelector('html');

      if (html) {
        html.style.marginTop = 'inherit';
      }
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

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
        <meta name="smartbanner:title" content="Pathology" />
        <meta name="smartbanner:author" content="Pathology" />
        <meta name="smartbanner:price" content="FREE" />
        <meta name="smartbanner:price-suffix-apple" content=" - On the App Store" />
        <meta name="smartbanner:price-suffix-google" content=" - In Google Play" />
        <meta name="smartbanner:icon-apple" content="./logo_pfp.png" />
        <meta name="smartbanner:icon-google" content="./logo_pfp.png" />
        <meta name="smartbanner:button" content="OPEN" />
        <meta name="smartbanner:button-url-apple" content="https://apps.apple.com/app/pathology-block-pushing-game/id1668925562" />
        <meta name="smartbanner:button-url-google" content="https://play.google.com/store/apps/details?id=com.pathology.gg" />
        <meta name="smartbanner:enabled-platforms" content="android,ios" />
        <meta name="smartbanner:close-label" content="Close" />
        <meta name="apple-itunes-app" content="app-id=1668925562, app-argument=pathology.gg" />

        <script async src="https://cdnjs.cloudflare.com/ajax/libs/smartbanner.js/1.14.6/smartbanner.min.js" integrity="sha512-ynhSS9bKNh6kNmX2pWqADgibWNzx3OtvffV5re9fQGmF04m0xXeP0a2XkMxc1IHxcCxJoUaTinPswDgFdF3eQQ==" crossOrigin="anonymous" referrerPolicy="no-referrer"></script>
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
        setShouldAttemptAuth: setShouldAttemptAuth,
        shouldAttemptAuth: shouldAttemptAuth,
      }}>
        <main className={rubik.className}>
          <Toaster toastOptions={{ duration: 1500 }} />
          <Component {...pageProps} />
        </main>
      </AppContext.Provider>
    </>
  );
}
