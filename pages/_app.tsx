/* istanbul ignore file */
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
import { usePostHogAnalytics } from '@root/hooks/usePostHogAnalytics';
import Notification from '@root/models/db/notification';
import { NextPageContext } from 'next';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'next-themes';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useState } from 'react';
import 'react-tooltip/dist/react-tooltip.css';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import useUser from '../hooks/useUser';
import '../styles/global.css';

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
  const multiplayerSocket = useMultiplayerSocket(user, selectedGame, notifications, setNotifications);

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
            }}
            twitter={{
              handle: '@thinkygg',
              site: selectedGame.baseUrl,
              cardType: 'summary_large_image'
            }}
          />
          <AppContext.Provider value={{
            deviceInfo: deviceInfo,
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
              backgroundColor: router.pathname === '/' && !user ? 'transparent' : 'var(--bg-color)',
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

          </AppContext.Provider>
        </ThemeProvider>
      </PostHogProvider>
    </>
  );
}
