import { Games } from '@root/constants/Games';
import { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import { GameId } from '../constants/GameId';

export function getGameIdFromReq(req?: NextApiRequest | IncomingMessage): GameId {
  const subdomain = req?.headers?.referer?.split('://')[1].split('.')[0];

  return Games[subdomain as GameId]?.id || GameId.PATHOLOGY;
}
