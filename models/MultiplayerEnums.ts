import { ObjectId } from 'bson';
import Level from './db/level';
import MultiplayerProfile from './db/multiplayerPlayer';
import User from './db/user';

export enum MultiplayerMatchType {
  ClassicRush = 'ClassicRush',
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
  eloChange: number;
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

export interface MatchLog {
  createdAt: Date;
  type: string;
  data: MatchLogDataFromUser | MatchLogDataGameRecap | MatchLogDataLevelComplete | null;
}

export enum MatchAction {
  CREATE = 'create',
  JOIN = 'join',
  QUIT = 'quit',
  COMPLETE_LEVEL = 'completeLevel',
  SKIP_LEVEL = 'skipLevel',
  GAME_START = 'gameStart',
  GAME_END = 'gameEnd',
  GAME_RECAP = 'gameRecap',
}
