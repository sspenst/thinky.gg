/* istanbul ignore file */
import 'react-tooltip/dist/react-tooltip.css';
import '../styles/global.css';
import { GrowthBook, GrowthBookProvider } from '@growthbook/growthbook-react';
import { Portal } from '@headlessui/react';
import DismissToast from '@root/components/toasts/dismissToast';
import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import MusicContextProvider from '@root/contexts/musicContext';
import getFontFromGameId from '@root/helpers/getFont';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { parseHostname } from '@root/helpers/parseUrl';
import useDeviceCheck from '@root/hooks/useDeviceCheck';
import Collection from '@root/models/db/collection';
import MultiplayerProfile from '@root/models/db/multiplayerProfile';
import Notification from '@root/models/db/notification';
import { NextPageContext } from 'next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { Router, useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import nProgress from 'nprogress';
import React, { useCallback, useEffect, useState } from 'react';
import CookieConsent from 'react-cookie-consent';
import TagManager, { TagManagerArgs } from 'react-gtm-module';
import toast, { Toaster } from 'react-hot-toast';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io, Socket } from 'socket.io-client';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';
import { MultiplayerMatchState } from '../models/constants/multiplayer';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import User, { UserWithMultiMultiplayerProfile, UserWithMultiplayerProfile } from '../models/db/user';

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

  const gameId = getGameIdFromReq(ctx.req);

  if (ctx.req) {
    userAgent = ctx.req.headers['user-agent'];
  } else {
    userAgent = navigator.userAgent;
  }

  return { userAgent, initGame: gameId ? Games[gameId] : Games[DEFAULT_GAME_ID] };
};

export default function MyApp({ Component, pageProps, userAgent, initGame }: AppProps & { userAgent: string, initGame: Game }) {
  const deviceInfo = useDeviceCheck(userAgent);
  const forceUpdate = useForceUpdate();
  const [host, setHost] = useState<string>('thinky.gg');
  const { isLoading, mutateUser, user } = useUser();
  const [multiplayerSocket, setMultiplayerSocket] = useState<MultiplayerSocket>({
    connectedPlayers: [],
    connectedPlayersCount: 0,
    matches: [],
    privateAndInvitedMatches: [],
    socket: undefined,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [playLater, setPlayLater] = useState<{ [key: string]: boolean }>();
  const [protocol, setProtocol] = useState<string>('https:');
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<Game>(initGame);
  // if the non-menu nav is visible
  const [showNav, setShowNav] = useState(true);
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  const [sounds, setSounds] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [tempCollection, setTempCollection] = useState<Collection>();
  const { matches, privateAndInvitedMatches } = multiplayerSocket;

  const mutatePlayLater = useCallback(() => {
    if (!user) {
      return;
    }

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
  }, [user]);

  useEffect(() => {
    // get selected game from the subdomain
    let subdomain = window.location.hostname.split('.')[0];

    if (subdomain === 'sokopath') {
      subdomain = 'sokoban';
    }

    const game: Game = Games[subdomain as GameId] || initGame;

    if (game !== undefined) {
      setSelectedGame(game);
    }
  }, [initGame]);

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

  useEffect(() => {
    setProtocol(window.location.protocol);
  }, []);

  useEffect(() => {
    let hostname = parseHostname(window.location.hostname);

    // if port is not 80 or 443, include it in the hostname
    if (hostname && window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443') {
      hostname += `:${window.location.port}`;
    }

    setHost(hostname || 'thinky.gg');
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
          socketConn.off('notifications');
          socketConn.off('reloadPage');
          socketConn.off('killSocket');
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

    const hasPortInUrl = window.location.port !== '';

    const socketConn = io('', {
      // we should not try to connect when running in dev mode (localhost:3000)
      autoConnect: !hasPortInUrl,
      path: '/api/socket/',
      withCredentials: true,
    });

    socketConn.on('notifications', (notifications: Notification[]) => {
      setNotifications(notifications);
    });
    socketConn.on('reloadPage', () => {
      toast.dismiss();
      toast.loading('There is a new version of the site! Reloading page in 15 seconds...', {
        duration: 15000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 15000);
    } );
    socketConn.on('killSocket', () => {
      console.log('killSocket');
      socketConn.disconnect();
    });
    socketConn.on('connectedPlayers', (connectedPlayers: {
      count: number;
      users: UserWithMultiMultiplayerProfile[];
    }) => {
      connectedPlayers.users.forEach(player => {
        if (player.multiplayerProfile === undefined) {
          return;
        }

        player.multiplayerProfile = (player.multiplayerProfile as MultiplayerProfile[]).filter(profile => profile.gameId?.toString() === selectedGame.id)[0];
      });
      setMultiplayerSocket(prevMultiplayerSocket => {
        return {
          connectedPlayers: connectedPlayers.users as UserWithMultiplayerProfile[],
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
      socketConn.off('notifications');
      socketConn.off('reloadPage');
      socketConn.off('killSocket');
      socketConn.disconnect();
    };
  }, [selectedGame.id, user?._id]);

  useEffect(() => {
  // check if redirect_type querystring parameter is set, and if it is equal to "patholoygg" console log hello
    const urlParams = new URLSearchParams(window.location.search);
    const redirectType = urlParams.get('redirect_type');

    if (redirectType === 'pathologygg') {
      setTimeout(() => {
        toast.dismiss();
        toast.success(
          <div className='flex'>
            <div className='flex flex-col gap-3'>
              <span>Welcome to Thinky.gg!</span><span>We&apos;ve redirected you from pathology.gg.</span><span>Please login again and update your bookmarks.</span><span>Click <Link className='underline' href='https://thinky.gg'>here</Link> to learn more.</span>
            </div>
            <DismissToast />
          </div>,
          {
            duration: 10000,
            icon: '👋',
          }
        );
      }, 1000);
    }
  }, []);

  useEffect(() => {
    for (const match of matches) {
      // if match is active and includes user, then redirect to match page /match/[matchId]

      if (match.state === MultiplayerMatchState.ACTIVE && match.players.some((player: User) => player?._id?.toString() === user?._id?.toString())) {
        // match sure current url isn't this
        if (router.pathname === '/[subdomain]/match/[matchId]' && router.query.matchId === match.matchId) {
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
        'user_id': user?._id.toString()
      };
    }

    TagManager.initialize(taskManagerArgs);
  }, [user?._id]);
  // }, [GA_ClientID, user?._id]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const isLevelPage = url.startsWith('/level/');

      // clear tempCollection when we navigate away from a level (temporary workaround)
      if (!isLevelPage) {
        setTempCollection(undefined);
      }

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

  useEffect(() => {
    if (window.ReactNativeWebView) {
      const loggedIn = user !== undefined;

      window.ReactNativeWebView.postMessage(JSON.stringify({ loggedIn: loggedIn }));
    }
  }, [user]);

  const isEU = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe');

  return (<>
    <ThemeProvider attribute='class' defaultTheme={Theme.Modern} themes={Object.values(Theme)}>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
        <meta name='apple-itunes-app' content='app-id=1668925562, app-argument=thinky.gg' />
        <link href={selectedGame.favicon || '/logo.svg'} rel='icon' />
      </Head>
      <DefaultSeo
        defaultTitle={selectedGame.seoTitle}
        description={selectedGame.seoDescription}
        canonical={`${selectedGame.baseUrl}'`}
        openGraph={{
          type: 'website',
          url: `${selectedGame.baseUrl}'`,
          siteName: selectedGame.displayName,
        }}
        twitter={{
          handle: '@thinkygg',
          site: selectedGame.baseUrl,
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
          game: selectedGame,
          host: host,
          multiplayerSocket: multiplayerSocket,
          mutatePlayLater: mutatePlayLater,
          mutateUser: mutateUser,
          notifications: notifications,
          playLater: playLater,
          protocol: protocol,
          setNotifications: setNotifications,
          setShouldAttemptAuth: setShouldAttemptAuth,
          setShowNav: setShowNav,
          setTempCollection: setTempCollection,
          shouldAttemptAuth: shouldAttemptAuth,
          showNav: showNav,
          sounds: sounds,
          tempCollection,
          user: isLoading ? undefined : !user ? null : user,
          userConfig: isLoading ? undefined : !user?.config ? null : user.config,
        }}>
          <div className={getFontFromGameId(selectedGame.id)} style={{
            backgroundColor: 'var(--bg-color)',
            color: 'var(--color)',
          }}>
            {/**
             * NB: using a portal here to mitigate issues clicking toasts with open modals
             * ideally we could have a Toaster component as a child of a modal so that clicking the
             * toast does not close the modal, but react-hot-toast currently does not support this:
             * https://github.com/timolins/react-hot-toast/issues/158
             */}
            <Portal>
              <Toaster toastOptions={{ duration: 1500 }} />
            </Portal>
            <MusicContextProvider>
              <Component {...pageProps} />
            </MusicContextProvider>
          </div>
        </AppContext.Provider>
      </GrowthBookProvider>
    </ThemeProvider>
  </>);
}
