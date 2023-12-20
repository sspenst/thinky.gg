import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { useContext } from 'react';

const LinksThatCarryOver = [
  '^/profile',
  '^/leaderboard',
  '^/users',
  '^/settings',
  '^/drafts',
  '^/search',
  '^/notifications',
  '^/collection/.+/play-later',
  '^/play-history',
  '^/play',
  '^/multiplayer',
  '^/tutorial'
];

export default function useUrl() {
  const { host, protocol } = useContext(AppContext);

  function getUrl(gameId?: GameId, path?: string) {
    function getSubdomain() {
      if (!gameId || gameId === GameId.THINKY) {
        return '';
      }

      return `${gameId.toLowerCase()}.`;
    }

    function getPath() {
      if (path) {
        return path;
      }

      if (typeof window === 'undefined') {
        return '/';
      }

      const carryOver = LinksThatCarryOver.some((link) => window.location.pathname.match(new RegExp(link)));

      return (carryOver ? window.location.pathname : '/');
    }

    return `${protocol}//${getSubdomain()}${host}${getPath()}`;
  }

  return getUrl;
}
