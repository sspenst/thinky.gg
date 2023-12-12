import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { useContext } from 'react';

const LinksThatCarryOver = [
  '^/profile',
  '^/home',
  '^/leaderboard',
  '^/users',
  '^/settings',
  '^/create',
  '^/search',
  '^/notifications',
  '^/collection/.+/play-later',
  '^/play-history',
  '^/play',
  '^/multiplayer',
  '^/tutorial'
];

export default function useUrl() {
  const { game } = useContext(AppContext);

  function getUrl(gameId?: GameId, path?: string) {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function getProtocol() {
      return window.location.protocol;
    }

    function getSubdomain() {
      if (!gameId || gameId === GameId.THINKY) {
        return '';
      }

      return `${gameId.toLowerCase()}.`;
    }

    function getHost() {
      // if port is not 80 or 443, include it in the hostname
      // also hostname needs to strip out subdomain
      const hostname = window.location.port === '80' || window.location.port === '443' ?
        window.location.hostname :
        `${window.location.hostname}:${window.location.port}`;
      const dots = hostname.split('.');

      const hostnameStrippedOfFirstSubdomain = dots.length === 2 ?
        dots.slice(1).join('.') : hostname;

      return (hostnameStrippedOfFirstSubdomain);
    }

    function getPath() {
      // if you click the same game it should go back to the home page
      if (game.id === gameId) {
        return gameId === GameId.THINKY ? '' : '/home';
      }

      if (path) {
        return path;
      }

      const carryOver = LinksThatCarryOver.some((link) => window.location.pathname.match(new RegExp(link)));

      return (carryOver ? window.location.pathname : '/home');
    }

    return `${getProtocol()}//${getSubdomain()}${getHost()}${getPath()}`;
  }

  return getUrl;
}
