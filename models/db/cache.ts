import { GameId } from '@root/constants/GameId';
import { Schema } from 'mongoose';

export enum CacheTag {
  SEARCH_API = 'api/search',
}

export interface Cache {
  key: string;
  value: Schema.Types.Mixed;
  gameId: GameId;
  tag: string;
  createdAt: Date;
  expireAt: Date; // When the document should expire
}

export default Cache;
