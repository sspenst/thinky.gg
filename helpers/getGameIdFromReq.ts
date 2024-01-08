import { Games } from '@root/constants/Games';
import { IncomingMessage } from 'http';
import type { NextApiRequest } from 'next';
import { DEFAULT_GAME_ID, GameId } from '../constants/GameId';

export function getGameIdFromReq(req?: NextApiRequest | IncomingMessage): GameId {
  // need to use referrer because we're inside a docker container
  const field = req?.headers?.host;
  const subdomain = field?.split('.')[0];

  const gameId = Games[subdomain as GameId]?.id || DEFAULT_GAME_ID;

  return gameId;
}

export function getGameFromReq(req?: NextApiRequest | IncomingMessage) {
  return Games[getGameIdFromReq(req)];
}

export function getGameFromId(gameId: GameId | undefined) {
  return Games[gameId || DEFAULT_GAME_ID];
}
