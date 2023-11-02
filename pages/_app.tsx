/* istanbul ignore file */
import '../styles/global.css';
import 'react-tooltip/dist/react-tooltip.css';
import { GrowthBook, GrowthBookProvider } from '@growthbook/growthbook-react';
import MusicContextProvider from '@root/contexts/musicContext';
import useDeviceCheck from '@root/hooks/useDeviceCheck';
import Collection from '@root/models/db/collection';
import { NextPageContext } from 'next';
import type { AppProps } from 'next/app';
import { Rubik, Teko } from 'next/font/google';
import Head from 'next/head';
import Router, { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import nProgress from 'nprogress';
import React, { useCallback, useEffect, useState } from 'react';
import CookieConsent from 'react-cookie-consent';
import TagManager, { TagManagerArgs } from 'react-gtm-module';
import { Toaster } from 'react-hot-toast';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io, Socket } from 'socket.io-client';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';
import { MultiplayerMatchState } from '../models/constants/multiplayer';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import User, { UserWithMultiplayerProfile } from '../models/db/user';

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

// Create a GrowthBook instance
const growthbook = new GrowthBook({
  apiHost: process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || 'https://cdn.growthbook.io',
  clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY || 'sdk-XUcOzkOQARhQXpCL',
  enableDevMode: true,
  trackingCallback: (experiment, result) => {
    console.log('Viewed Experiment', experiment, result, 'calling window.gtag (which is ', window?.gtag);
    window?.gtag('event', 'experiment_viewed', {
      event_category: 'experiment',
      experiment_id: experiment.key,
      variation_id: result.variationId,
    });
  },
});

const GTM_TRACKING_ID = 'GTM-WBDLFZ5T';

function updateGrowthBookURL() {
  growthbook.setURL(window.location.href);
}

MyApp.getInitialProps = async ({ ctx }: { ctx: NextPageContext }) => {
  let userAgent;

  if (ctx.req) {
    userAgent = ctx.req.headers['user-agent'];
  } else {
    userAgent = navigator.userAgent;
  }

  return { userAgent };
};

export default function MyApp({ Component, pageProps, userAgent }: AppProps & { userAgent: string }) {
  const deviceInfo = useDeviceCheck(userAgent);
  const forceUpdate = useForceUpdate();
  const { isLoading, mutateUser, user } = useUser();
  const [multiplayerSocket, setMultiplayerSocket] = useState<MultiplayerSocket>({
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  });
  const [playLater, setPlayLater] = useState<{ [key: string]: boolean }>();
  const router = useRouter();
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  const [sounds, setSounds] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [tempCollection, setTempCollection] = useState<Collection>();
  const [theme, setTheme] = useState<string>();
  const { matches, privateAndInvitedMatches } = multiplayerSocket;

  const mutatePlayLater = useCallback(() => {
    fetch('/api/play-later', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setPlayLater(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
    });
  }, []);

  useEffect(() => {
    mutatePlayLater();
  }, [mutatePlayLater]);

  // preload sounds
  useEffect(() => {
    setSounds({
      'start': new Audio('/sounds/start.wav'),
      'warning': new Audio('/sounds/warning.wav'),
    });
  }, []);

  // initialize sessionStorage values
  useEffect(() => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    const shouldAttemptAuthStorage = window.sessionStorage.getItem('shouldAttemptAuth');

    if (shouldAttemptAuthStorage) {
      setShouldAttemptAuth(shouldAttemptAuthStorage === 'true');
    }

    const tempCollectionStorage = window.sessionStorage.getItem('tempCollection');

    if (tempCollectionStorage) {
      try {
        setTempCollection(JSON.parse(tempCollectionStorage));
      } catch (e) {
        console.error('error parsing tempCollection', e);
      }
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

    if (Object.values(Theme).includes(user.config.theme as Theme) && theme !== user.config.theme) {
      // need to remove the default theme so we can add the userConfig theme
      document.body.classList.remove(Theme.Modern);
      document.body.classList.add(user.config.theme);
      setTheme(user.config.theme);
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

        // if the current tab is active
        if (document.visibilityState === 'visible') {
          router.push(`/match/${match.matchId}`);
        }

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

  // const [GA_ClientID, setGA_ClientID] = useState<string>();

  // useEffect(() => {
  //   if (window?.gtag) {
  //     window.gtag('get', GTM_TRACKING_ID, 'client_id', (clientId: string) => {
  //       setGA_ClientID(clientId);
  //     });
  //   } else {
  //     console.warn('no gtag... cant get GA ClientID');
  //   }
  // }, []);

  useEffect(() => {
    const gtmId = GTM_TRACKING_ID;
    // per https://github.com/alinemorelli/react-gtm/issues/14
    const taskManagerArgs: TagManagerArgs = {
      gtmId: gtmId,
    };

    if (user?._id) {
      taskManagerArgs.dataLayer = {
        'event': 'userId_set',
        'userId': user?._id.toString()
      };
    }

    TagManager.initialize(taskManagerArgs);
  }, [user?._id]);
  // }, [GA_ClientID, user?._id]);

  useEffect(() => {
    const handleRouteChange = () => {
      updateGrowthBookURL();
      nProgress.done();
    };

    Router.events.on('routeChangeStart', () => nProgress.start());

    Router.events.on('routeChangeError', () => nProgress.done());
    growthbook.loadFeatures({ autoRefresh: true });

    // if (GA_ClientID) {
    //   growthbook.setAttributes({
    //     id: user?._id || GA_ClientID,
    //     userId: user?._id,
    //     clientId: GA_ClientID,
    //     name: user?.name,
    //     loggedIn: user !== undefined,
    //     browser: navigator.userAgent,
    //     url: router.pathname,
    //     host: window.location.host,
    //     roles: user?.roles,
    //   });
    // }

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('routeChangeStart', () => nProgress.start());
      router.events.off('routeChangeError', () => nProgress.done());
    };
  }, [router.events, router.pathname, user]);
  // }, [GA_ClientID, router.events, router.pathname, user]);

  const isEU = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe');

  return (
    <ThemeProvider attribute='class'>
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
      <GrowthBookProvider growthbook={growthbook}>
        <AppContext.Provider value={{
          deviceInfo: deviceInfo,
          forceUpdate: forceUpdate,
          multiplayerSocket: multiplayerSocket,
          mutatePlayLater: mutatePlayLater,
          mutateUser: mutateUser,
          playLater: playLater,
          setShouldAttemptAuth: setShouldAttemptAuth,
          setTempCollection: setTempCollection,
          setTheme: setTheme,
          shouldAttemptAuth: shouldAttemptAuth,
          sounds: sounds,
          tempCollection,
          theme: theme,
          user: user,
          userConfig: user?.config,
          userLoading: isLoading,
        }}>
          <div className={rubik.className} style={{
            backgroundColor: 'var(--bg-color)',
            color: 'var(--color)',
          }}>
            <Toaster toastOptions={{ duration: 1500 }} />
            <MusicContextProvider>
              <Component {...pageProps} />
            </MusicContextProvider>
          </div>
        </AppContext.Provider>
      </GrowthBookProvider>
    </ThemeProvider>
  );
}
