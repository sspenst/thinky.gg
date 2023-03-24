/* istanbul ignore file */

import '../styles/global.css';
import type { AppProps } from 'next/app';
import { Rubik, Teko } from 'next/font/google';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import nProgress from 'nprogress';
import React, { useEffect, useState } from 'react';
import CookieConsent from 'react-cookie-consent';
import { Toaster } from 'react-hot-toast';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io, Socket } from 'socket.io-client';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import isTheme from '../helpers/isTheme';
import useUser from '../hooks/useUser';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import User, { UserWithMultiplayerProfile } from '../models/db/user';
import { MultiplayerMatchState } from '../models/MultiplayerEnums';

export const rubik = Rubik({ display: 'swap', subsets: ['latin'] });
export const teko = Teko({ display: 'swap', subsets: ['latin'], weight: '500' });

export interface MultiplayerSocket {
  connectedPlayers: UserWithMultiplayerProfile[];
  connectedPlayersCount: number;
  matches: MultiplayerMatch[];
  privateAndInvitedMatches: MultiplayerMatch[];
  socket: Socket<DefaultEventsMap, DefaultEventsMap> | undefined;
}

function useForceUpdate() {
  const [value, setState] = useState(true);

  return () => setState(!value);
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const forceUpdate = useForceUpdate();
  const { isLoading, mutateUser, user } = useUser();
  const [multiplayerSocket, setMultiplayerSocket] = useState<MultiplayerSocket>({
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  });
  const router = useRouter();
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  const { matches, privateAndInvitedMatches } = multiplayerSocket;

  Router.events.on('routeChangeStart', () => nProgress.start());
  Router.events.on('routeChangeComplete', () => nProgress.done());
  Router.events.on('routeChangeError', () => nProgress.done());

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

  useEffect(() => {
    if (!user?._id) {
      setMultiplayerSocket(prevMultiplayerSocket => {
        if (prevMultiplayerSocket.socket) {
          const socketConn = prevMultiplayerSocket.socket;

          socketConn.off('connectedPlayers');
          socketConn.off('matches');
          socketConn.off('privateAndInvitedMatches');
          socketConn.disconnect();
        }

        return {
          connectedPlayers: [],
          connectedPlayersCount: 0,
          matches: [],
          privateAndInvitedMatches: [],
          socket: undefined,
        };
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
  }, [user?._id]);

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

  useEffect(() => {
    for (const match of matches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        // match sure current url isn't this
        if (router.pathname === '/match/[matchId]' && router.query.matchId === match.matchId) {
          return;
        }

        router.push(`/match/${match.matchId}`);

        return;
      }
    }

    for (const match of privateAndInvitedMatches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]
      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        // match sure current url isn't this
        if (router.pathname === '/match/[matchId]' && router.query.matchId === match.matchId) {
          return;
        }

        router.push(`/match/${match.matchId}`);

        return;
      }
    }
  }, [matches, privateAndInvitedMatches, router, user]);

  const isEU = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe');

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
        <meta name='apple-itunes-app' content='app-id=1668925562, app-argument=pathology.gg' />
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
      {isEU && (
        <CookieConsent
          buttonStyle={{ color: '#000000', backgroundColor: '#FFFFFF', fontSize: '13px', borderRadius: '2px' }}
          buttonText='Got it'
          cookieName='cookie_consent'
          location='bottom'
          style={{ background: '#2B373B', alignItems: 'center' }}
          expires={360}
        >
          Our website uses cookies to improve your browsing experience. By continuing to use this site, you consent to our use of cookies.
          <br />
          <span style={{ fontSize: '10px' }}>
            Learn more in our <a className='hover:underline text-blue-300' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a>.
          </span>
        </CookieConsent>
      )}
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
