import { Games } from '@root/constants/Games';
import { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import { DEFAULT_GAME_ID, GameId } from '../constants/GameId';

export function getGameIdFromReq(req?: NextApiRequest | IncomingMessage): GameId {
  // need to use referrer because we're inside a docker container
  const field = req?.headers?.host?.includes('app-server') ? req.headers.referer : req?.headers?.host;
  const subdomain = field?.split('.')[0];

  const subdomainStripProtocol = subdomain?.includes('://') ? subdomain.split('://')[1] : subdomain;

  return Games[subdomainStripProtocol as GameId]?.id || DEFAULT_GAME_ID;
}
