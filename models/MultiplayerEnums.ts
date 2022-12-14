import { ObjectId } from 'bson';
import Level from './db/level';
import MultiplayerProfile from './db/multiplayerProfile';
import User from './db/user';

export enum MultiplayerMatchType {
  RushBullet = 'RushBullet',
  RushBlitz = 'RushBlitz',
  RushRapid = 'RushRapid',
  RushClassic = 'RushClassic',

  // BlitzRush = 'BlitzRush', // TODO
  // BulletRush = 'BulletRush', // TODO
}

export enum MultiplayerMatchState {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  ABORTED = 'ABORTED',
  FINISHED = 'FINISHED',
}

export interface MatchLogDataFromUser {
  userId: User | ObjectId;
}
export interface MatchLogDataGameRecap {
  eloChangeWinner: number;
  eloChangeLoser: number;
  winnerProvisional: boolean;
  loserProvisional: boolean;
  winner: MultiplayerProfile;
  loser: MultiplayerProfile;
}
export interface MatchLogDataLevelComplete {
  userId: User | ObjectId;
  levelId: Level | ObjectId;
}
export interface MatchLogDataUserLeveId {
  userId: ObjectId;
}
export interface MatchLogGeneric {
  log: string
}
export interface MatchLog {
  createdAt: Date;
  type: string;
  data: MatchLogGeneric | MatchLogDataFromUser | MatchLogDataGameRecap | MatchLogDataLevelComplete | null;
}

export enum MatchAction {
  CREATE = 'create',
  JOIN = 'join',
  QUIT = 'quit',
  ABORTED = 'aborted',
  COMPLETE_LEVEL = 'completeLevel',
  SKIP_LEVEL = 'skipLevel',
  GAME_START = 'gameStart',
  GAME_END = 'gameEnd',
  GAME_RECAP = 'gameRecap',
}
