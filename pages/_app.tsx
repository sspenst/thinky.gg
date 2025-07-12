/* istanbul ignore file */
import 'react-tooltip/dist/react-tooltip.css';
import '../styles/global.css';
import CookieConsentBanner from '@root/components/app/CookieConsentBanner';
import ToasterPortal from '@root/components/app/ToasterPortal';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import MusicContextProvider from '@root/contexts/musicContext';
import getFontFromGameId from '@root/helpers/getFont';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { useAppInitialization } from '@root/hooks/useAppInitialization';
import useDeviceCheck from '@root/hooks/useDeviceCheck';
import { useMultiplayerSocket } from '@root/hooks/useMultiplayerSocket';
import { useNotifications } from '@root/hooks/useNotifications';
import { usePostHogAnalytics } from '@root/hooks/usePostHogAnalytics';
import Notification from '@root/models/db/notification';
import { NextPageContext } from 'next';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useState } from 'react';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';

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

// Minimal wrapper for discord-play pages (no PostHog, no Theme, minimal context)
function DiscordPlayWrapper({
  children,
  initGame,
  userAgent
}: {
  children: React.ReactNode;
  initGame: Game;
  userAgent: string;
}) {
  const deviceInfo = useDeviceCheck(userAgent);
  const userHook = useUser();
  const { isLoading: isLoadingUser, mutateUser, user } = userHook;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNav, setShowNav] = useState(false); // Discord play doesn't need nav

  // Minimal context for discord-play
  const contextValue = {
    deviceInfo,
    game: initGame,
    host: undefined,
    multiplayerSocket: {
      connectedPlayers: [],
      connectedPlayersCount: 0,
      matches: [],
      privateAndInvitedMatches: [],
      socket: undefined,
    },
    mutatePlayLater: () => {},
    mutateUser,
    notifications,
    playLater: undefined,
    protocol: undefined,
    setNotifications,
    setShouldAttemptAuth: () => {},
    setShowNav,
    setTempCollection: () => {},
    shouldAttemptAuth: false, // Discord play doesn't need auth attempts
    showNav,
    sounds: {},
    tempCollection: undefined,
    user: isLoadingUser ? undefined : !user ? null : user,
    userConfig: isLoadingUser ? undefined : !user?.config ? null : user.config,
    userHook,
  };

  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
        <link href={initGame.favicon} rel='icon' />
      </Head>
      <AppContext.Provider value={contextValue}>
        <div className={getFontFromGameId(initGame.id)} style={{
          backgroundColor: 'var(--bg-color)',
          color: 'var(--color)',
        }}>
          <ToasterPortal />
          <MusicContextProvider>
            {children}
            <CookieConsentBanner />
          </MusicContextProvider>
        </div>
      </AppContext.Provider>
    </>
  );
}

// Full context provider for regular pages
function FullAppProvider({
  children,
  initGame,
  userAgent
}: {
  children: React.ReactNode;
  initGame: Game;
  userAgent: string;
}) {
  const deviceInfo = useDeviceCheck(userAgent);
  const userHook = useUser();
  const { isLoading: isLoadingUser, mutateUser, user } = userHook;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const [showNav, setShowNav] = useState(true);

  // Use custom hooks
  usePostHogAnalytics(user);
  const {
    host,
    playLater,
    protocol,
    selectedGame,
    shouldAttemptAuth,
    setShouldAttemptAuth,
    sounds,
    tempCollection,
    setTempCollection,
    mutatePlayLater,
  } = useAppInitialization(user, initGame);
  const notificationActions = useNotifications({ notifications, setNotifications });
  const multiplayerSocket = useMultiplayerSocket(user, selectedGame, notifications, notificationActions);

  const contextValue = {
    deviceInfo,
    game: selectedGame,
    host,
    multiplayerSocket,
    mutatePlayLater,
    mutateUser,
    notifications,
    playLater,
    protocol,
    setNotifications,
    setShouldAttemptAuth,
    setShowNav,
    setTempCollection,
    shouldAttemptAuth,
    showNav,
    sounds,
    tempCollection,
    user: isLoadingUser ? undefined : !user ? null : user,
    userConfig: isLoadingUser ? undefined : !user?.config ? null : user.config,
    userHook,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export default function MyApp({ Component, pageProps, userAgent, initGame }: AppProps & { userAgent: string, initGame: Game }) {
  const router = useRouter();

  // Check if we're on the discord-play page
  const isDiscordPlayPage = router.pathname === '/[subdomain]/discord-play' ||
                           router.pathname.includes('discord-play');

  // For discord-play pages, use minimal wrapper without PostHog and Theme providers
  if (isDiscordPlayPage) {
    return (
      <DiscordPlayWrapper initGame={initGame} userAgent={userAgent}>
        <Component {...pageProps} />
      </DiscordPlayWrapper>
    );
  }

  // For regular pages, use full providers
  return (
    <>
      <PostHogProvider client={posthog}>
        <ThemeProvider attribute='class' defaultTheme={Theme.Modern} themes={Object.values(Theme)}>
          <Head>
            <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
            <meta name='apple-itunes-app' content='app-id=1668925562, app-argument=thinky.gg' />
            <link href={initGame.favicon} rel='icon' />
          </Head>
          <DefaultSeo
            defaultTitle={initGame.seoTitle}
            description={initGame.seoDescription}
            canonical={`${initGame.baseUrl}'`}
            openGraph={{
              type: 'website',
              url: `${initGame.baseUrl}'`,
              siteName: initGame.displayName,
            }}
            twitter={{
              handle: '@thinkygg',
              site: initGame.baseUrl,
              cardType: 'summary_large_image'
            }}
          />
          <FullAppProvider initGame={initGame} userAgent={userAgent}>
            <div className={getFontFromGameId(initGame.id)} style={{
              backgroundColor: router.pathname === '/' ? 'transparent' : 'var(--bg-color)',
              color: 'var(--color)',
            }}>
              {/**
                * NB: using a portal here to mitigate issues clicking toasts with open modals
                * ideally we could have a Toaster component as a child of a modal so that clicking the
                * toast does not close the modal, but react-hot-toast currently does not support this:
                * https://github.com/timolins/react-hot-toast/issues/158
                */}
              <ToasterPortal />
              <MusicContextProvider>
                <Component {...pageProps} />
                <CookieConsentBanner />
              </MusicContextProvider>
            </div>
          </FullAppProvider>
        </ThemeProvider>
      </PostHogProvider>
    </>
  );
}
