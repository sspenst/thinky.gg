import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { useContext } from 'react';

const LinksThatCarryOver = [
  '^/collection/.+/play-later',
  '^/drafts',
  '^/leaderboards',
  '^/multiplayer',
  '^/notifications',
  '^/play-history',
  '^/pro',
  '^/profile',
  '^/search',
  '^/settings',
  '^/tutorial',
  '^/users',
];

export default function useUrl() {
  const { host, protocol } = useContext(AppContext);

  function getUrl(gameId?: GameId, path?: string) {
    function getSubdomain() {
      // can't use game.baseUrl because this function is client side and we NEXT_PUBLIC isn't working at the moment
      const game = getGameFromId(gameId);

      if (!game.subdomain) {
        return '';
      }

      return `${game.subdomain}.`;
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
