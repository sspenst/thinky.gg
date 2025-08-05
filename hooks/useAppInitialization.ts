import DismissToast from '@root/components/toasts/dismissToast';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import isPro from '@root/helpers/isPro';
import { parseHostname } from '@root/helpers/parseUrl';
import Collection from '@root/models/db/collection';
import { useRouter } from 'next/router';
import nProgress from 'nprogress';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ReqUser } from '../models/db/user';

export function useAppInitialization(user: ReqUser | null | undefined, initGame: Game) {
  const router = useRouter();
  const [host, setHost] = useState<string>('thinky.gg');
  const [playLater, setPlayLater] = useState<{ [key: string]: boolean }>();
  const [protocol, setProtocol] = useState<string>('https:');
  const [selectedGame, setSelectedGame] = useState<Game>(initGame);
  const [shouldAttemptAuth, setShouldAttemptAuth] = useState(true);
  const [sounds, setSounds] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [tempCollection, setTempCollection] = useState<Collection>();

  const mutatePlayLater = useCallback(() => {
    if (!isPro(user)) {
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

  // Set selected game from subdomain
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

  // Load play later data
  useEffect(() => {
    mutatePlayLater();
  }, [mutatePlayLater]);

  // Preload sounds
  useEffect(() => {
    setSounds({
      'start': new Audio('/sounds/start.wav'),
      'warning': new Audio('/sounds/warning.wav'),
    });
  }, []);

  // Set protocol
  useEffect(() => {
    setProtocol(window.location.protocol);
  }, []);

  // Set host
  useEffect(() => {
    let hostname = parseHostname(window.location.hostname);

    // if port is not 80 or 443, include it in the hostname
    if (hostname && window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443') {
      hostname += `:${window.location.port}`;
    }

    setHost(hostname || 'thinky.gg');
  }, []);

  // Initialize sessionStorage values
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

  // Update sessionStorage when shouldAttemptAuth changes
  useEffect(() => {
    if (typeof window.sessionStorage === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('shouldAttemptAuth', String(shouldAttemptAuth));
  }, [shouldAttemptAuth]);

  // Handle redirect type and UTM tracking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectType = urlParams.get('redirect_type');
    const utmSource = urlParams.get('utm_source');

    if (utmSource) {
      if (!window.localStorage.getItem('utm_source')) {
        console.log('Storing utm_source', utmSource);
        window.localStorage.setItem('utm_source', utmSource);
      } else {
        console.log('utm_source already set', window.localStorage.getItem('utm_source'));
      }
    }

    if (redirectType === 'bot-not-allowed') {
      setTimeout(() => {
        toast.dismiss();
        toast.success(
          React.createElement('div', { className: 'flex' },
            React.createElement('div', { className: 'flex flex-col gap-3' },
              'Bots are not allowed to play Thinky.gg levels.'
            ),
            React.createElement(DismissToast)
          ),
          {
            duration: 10000,
            icon: '👋',
          }
        );
      }, 1000);
    }
  }, []);

  // Handle router events
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const isLevelPage = url.startsWith('/level/');

      // clear tempCollection when we navigate away from a level (temporary workaround)
      if (!isLevelPage) {
        setTempCollection(undefined);
      }

      nProgress.done();
    };

    router.events.on('routeChangeStart', () => nProgress.start());
    router.events.on('routeChangeError', () => nProgress.done());
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('routeChangeStart', () => nProgress.start());
      router.events.off('routeChangeError', () => nProgress.done());
    };
  }, [router.events, router.pathname, user]);

  // Handle React Native WebView
  useEffect(() => {
    if (window.ReactNativeWebView) {
      const loggedIn = user !== undefined;

      window.ReactNativeWebView.postMessage(JSON.stringify({ loggedIn: loggedIn }));

      // Send badge count if user has notifications
      if (user && user.notifications) {
        const unreadCount = user.notifications.filter(n => !n.read).length;

        window.ReactNativeWebView.postMessage(JSON.stringify({
          action: 'update_badge_count',
          count: unreadCount
        }));
      }
    }
  }, [user]);

  return {
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
  };
}
