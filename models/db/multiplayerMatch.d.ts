import { Types } from 'mongoose';
import Level from './level';
import User from './user';

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
interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  endTime: Date;
  levels: Level[];
  matchId: string;
  matchLog: string[];
  players: User[];
  private: boolean;
  type: MultiplayerMatchType;
  scoreTable: {
    [key: string]: number;
  };
  startTime: Date;
  state: MultiplayerMatchState;
  updatedAt: Date;
  winners: User[];
}

export default MultiplayerMatch;
