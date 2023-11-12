import { Types } from 'mongoose';
import Level from '../db/level';
import MultiplayerProfile from '../db/multiplayerProfile';
import User from '../db/user';

export enum MultiplayerMatchType {
  RushBullet = 'RushBullet',
  RushBlitz = 'RushBlitz',
  RushRapid = 'RushRapid',
  RushClassical = 'RushClassical',
}

export enum MultiplayerMatchState {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  ABORTED = 'ABORTED',
  FINISHED = 'FINISHED',
}

export const MultiplayerMatchTypeDurationMap: Record<MultiplayerMatchType, number> = {
  [MultiplayerMatchType.RushBullet]: 60000 * 3,
  [MultiplayerMatchType.RushBlitz]: 60000 * 5,
  [MultiplayerMatchType.RushRapid]: 60000 * 10,
  [MultiplayerMatchType.RushClassical]: 60000 * 30,
} as Record<MultiplayerMatchType, number>;

export interface MatchLogDataFromUser {
  userId: User | Types.ObjectId;
}

export interface MatchLogDataGameRecap {
  eloChangeWinner: number;
  eloChangeLoser: number;
  eloWinner: number;
  eloLoser: number;
  winnerProvisional: boolean;
  loserProvisional: boolean;
  winner: MultiplayerProfile;
  loser: MultiplayerProfile;
}

export interface MatchLogDataLevelComplete {
  userId: User | Types.ObjectId;
  levelId: Level | Types.ObjectId;
}

export interface MatchLogDataUserLeveId {
  userId: Types.ObjectId;
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
  MARK_READY = 'markReady',
  QUIT = 'quit',
  ABORTED = 'aborted',
  COMPLETE_LEVEL = 'completeLevel',
  SKIP_LEVEL = 'skipLevel',
  GAME_START = 'gameStart',
  GAME_END = 'gameEnd',
  GAME_RECAP = 'gameRecap',
}
