import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';

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

    const game = getGameFromId(gameId);

    return game.baseUrl + getPath();
  }

  return getUrl;
}
