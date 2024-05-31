import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import { MatchLog, MultiplayerMatchType } from '../constants/multiplayer';
import Level from './level';
import User, { UserWithMultiplayerProfile } from './user';

interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  createdBy: User;
  endTime: Date;
  gameId: GameId;
  gameTable?: {
    [key: string]: Level[];
  };
  levels: Level[] | Types.ObjectId[];
  levelsPopulated: Level[]; // virtual
  markedReady: Types.ObjectId[] | User[] | string[];
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
