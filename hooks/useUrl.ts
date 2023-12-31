import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
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

    // can't use game.baseUrl because this function is client side and we NEXT_PUBLIC isn't working at the moment
    const game = getGameFromId(gameId);

    const hostTLD = host?.split('.').slice(-2).join('.');
    const baseUrl = protocol + '//' + game.subdomain + '.' + hostTLD;

    return baseUrl + getPath();
  }

  return getUrl;
}
