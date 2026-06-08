/* istanbul ignore file */
import 'react-tooltip/dist/react-tooltip.css';
import '../styles/global.css';
import CookieConsentBanner from '@root/components/app/CookieConsentBanner';
import OpenReplay from '@root/components/openReplay';
import { Confetti } from '@root/components/page/confetti';
import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import MusicContextProvider from '@root/contexts/musicContext';
import MultiplayerSocketProvider from '@root/contexts/multiplayerSocketProvider';
import getFontFromGameId from '@root/helpers/getFont';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { useAppInitialization } from '@root/hooks/useAppInitialization';
import useDeviceCheck from '@root/hooks/useDeviceCheck';
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
import { useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
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

export default function MyApp({ Component, pageProps, userAgent, initGame }: AppProps & { userAgent: string, initGame: Game }) {
  const deviceInfo = useDeviceCheck(userAgent);

  const { isLoading, mutateUser, user } = useUser();
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

  const resolvedUser = isLoading ? undefined : !user ? null : user;
  const resolvedUserConfig = isLoading ? undefined : !user?.config ? null : user.config;

  // Memoized so the AppContext value identity only changes when one of these fields actually
  // changes. The high-frequency multiplayer socket state is intentionally NOT here (it lives
  // in MultiplayerSocketProvider below) so socket broadcasts don't re-render AppContext
  // consumers like Grid/Game.
  const appContextValue = useMemo(() => ({
    deviceInfo,
    game: selectedGame,
    host,
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
    user: resolvedUser,
    userConfig: resolvedUserConfig,
  }), [deviceInfo, selectedGame, host, mutatePlayLater, mutateUser, notifications, playLater, protocol, setNotifications, setShouldAttemptAuth, setShowNav, setTempCollection, shouldAttemptAuth, showNav, sounds, tempCollection, resolvedUser, resolvedUserConfig]);

  return (
    <>
      <PostHogProvider client={posthog}>
        <ThemeProvider attribute='class' defaultTheme={Theme.Modern} themes={Object.values(Theme)}>
          <Head>
            <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' />
            <meta name='apple-itunes-app' content='app-id=1668925562, app-argument=thinky.gg' />
            <link href={selectedGame.favicon} rel='icon' />
          </Head>
          <DefaultSeo
            defaultTitle={selectedGame.seoTitle}
            description={selectedGame.seoDescription}
            canonical={`${selectedGame.baseUrl}'`}
            openGraph={{
              type: 'website',
              url: `${selectedGame.baseUrl}'`,
              siteName: selectedGame.displayName,
              images: [
                {
                  url: 'https://i.imgur.com/HXqAKZg.png',
                  width: 1200,
                  height: 630,
                  alt: selectedGame.displayName,
                },
              ],
            }}
            twitter={{
              handle: '@thinkygg',
              site: selectedGame.baseUrl,
              cardType: 'summary_large_image'
            }}
          />
          <AppContext.Provider value={appContextValue}>
            <Toaster toastOptions={{ duration: 1500 }} />
            <Confetti />
            <OpenReplay />
            <MultiplayerSocketProvider
              notificationActions={notificationActions}
              notifications={notifications}
              selectedGame={selectedGame}
              user={user}
            >
              <div className={getFontFromGameId(selectedGame.id)} style={{
                backgroundColor: router.pathname === '/' && !user ? 'transparent' : 'var(--bg-color)',
                color: 'var(--color)',
              }}>
                <MusicContextProvider>
                  <Component {...pageProps} />
                  <CookieConsentBanner />
                </MusicContextProvider>
              </div>
            </MultiplayerSocketProvider>
          </AppContext.Provider>
        </ThemeProvider>
      </PostHogProvider>
    </>
  );
}
