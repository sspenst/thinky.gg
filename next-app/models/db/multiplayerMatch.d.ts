import { Types } from 'mongoose';
import { MatchLog, MultiplayerMatchType } from '../MultiplayerEnums';
import Level from './level';
import User, { UserWithMultiplayerProfile } from './user';

interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  createdBy: User;
  endTime: Date;
  gameTable?: {
    [key: string]: Level[];
  };
  levels: Level[] | Types.ObjectId[];
  levelsPopulated: Level[]; // virtual
  markedReady: UserWithMultiplayerProfile[];
  matchId: string;
  matchLog?: MatchLog[];
  players: UserWithMultiplayerProfile[];

  private: boolean;
  rated: boolean;
  scoreTable: {
    [key: string]: number; // virtual
  };
  startTime: Date;
  state: MultiplayerMatchState;
  timeUntilStart: number; // virtual
  timeUntilEnd: number; // virtual
  type: MultiplayerMatchType;
  updatedAt: Date;
  winners: User[] | Types.ObjectId[];
}

export default MultiplayerMatch;
