import { Types } from 'mongoose';
import { MatchLog } from '../MultiplayerEnums';
import Level from './level';
import User, { UserWithMultiplayerProfile } from './user';

interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  createdBy: User;
  endTime: Date;
  levels: Level[] | Types.ObjectId[];
  levelsPopulated: Level[]; // virtual
  matchId: string;
  matchLog?: MatchLog[];
  players: UserWithMultiplayerProfile[];
  private: boolean;
  rated: boolean;
  type: MultiplayerMatchType;
  gameTable?: {
    [key: string]: Level[];
  }
  scoreTable: {
    [key: string]: number; // virtual
  };
  startTime: Date;
  state: MultiplayerMatchState;
  timeUntilStart: number; // virtual
  timeUntilEnd: number; // virtual
  updatedAt: Date;
  winners: User[] | Types.ObjectId[];
}

export default MultiplayerMatch;
