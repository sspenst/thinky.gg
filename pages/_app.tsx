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
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io, Socket } from 'socket.io-client';
import { AppContext } from '../contexts/appContext';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '../models/db/user';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });

export interface MultiplayerSocket {
  connectedPlayers: UserWithMultiplayerProfile[];
  connectedPlayersCount: number;
  matches: MultiplayerMatch[];
  privateAndInvitedMatches: MultiplayerMatch[];
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const [multiplayerSocket, setMultiplayerSocket] = useState<MultiplayerSocket>({
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  });
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);

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
    // don't attempt to connect if not logged in
    if (!shouldAttemptAuth) {
      setMultiplayerSocket({
        connectedPlayers: [],
        connectedPlayersCount: 0,
        matches: [],
        privateAndInvitedMatches: [],
        socket: undefined,
      });

      return;
    }

    const socketConn = io('', {
      path: '/api/socket/',
      withCredentials: true,
    });

    socketConn.on('connectedPlayers', (connectedPlayers: {
      count: number;
      users: UserWithMultiplayerProfile[];
    }) => {
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: connectedPlayers.users,
          connectedPlayersCount: connectedPlayers.count,
          matches: prevMultiplayerSocket.matches,
          privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    socketConn.on('matches', (matches: MultiplayerMatch[]) => {
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: prevMultiplayerSocket.connectedPlayers,
          connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
          matches: matches,
          privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    socketConn.on('privateAndInvitedMatches', (privateAndInvitedMatches: MultiplayerMatch[]) => {
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: prevMultiplayerSocket.connectedPlayers,
          connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
          matches: prevMultiplayerSocket.matches,
          privateAndInvitedMatches: privateAndInvitedMatches,
          socket: prevMultiplayerSocket.socket,
        };
      });
    });

    setMultiplayerSocket(prevMultiplayerSocket => {
      return {
        connectedPlayers: prevMultiplayerSocket.connectedPlayers,
        connectedPlayersCount: prevMultiplayerSocket.connectedPlayersCount,
        matches: prevMultiplayerSocket.matches,
        privateAndInvitedMatches: prevMultiplayerSocket.privateAndInvitedMatches,
        socket: socketConn,
      };
    });

    return () => {
      socketConn.off('connectedPlayers');
      socketConn.off('matches');
      socketConn.off('privateAndInvitedMatches');
      socketConn.disconnect();
    };
  }, [shouldAttemptAuth]);

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
        multiplayerSocket: multiplayerSocket,
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
