import { GameId } from '@root/constants/GameId';
import { useEffect, useState } from 'react';

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
  const [host, setHost] = useState<string>();
  const [protocol, setProtocol] = useState<string>();

  useEffect(() => {
    setProtocol(window.location.protocol);

    // if port is not 80 or 443, include it in the hostname
    // also hostname needs to strip out subdomain
    const hostname = window.location.port === '80' || window.location.port === '443' ?
      window.location.hostname :
      `${window.location.hostname}:${window.location.port}`;
    const dots = hostname.split('.');

    const hostnameStrippedOfFirstSubdomain = dots.length === 2 ?
      dots.slice(1).join('.') : hostname;

    setHost(hostnameStrippedOfFirstSubdomain);
  }, []);

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
