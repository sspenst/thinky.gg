import { Games } from '@root/constants/Games';
import { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import { DEFAULT_GAME_ID, GameId } from '../constants/GameId';

export function getGameIdFromReq(req?: NextApiRequest | IncomingMessage): GameId {
  const subdomain = req?.headers?.host?.split('.')[0];

  return Games[subdomain as GameId]?.id || DEFAULT_GAME_ID;
}
