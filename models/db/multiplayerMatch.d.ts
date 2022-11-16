import { Types } from 'mongoose';
import { MultiplayerMatchState, MultiplayerMatchType } from '../schemas/multiplayerMatchSchema';
import Level from './level';
import User from './user';

interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  createdBy: User;
  endTime: Date;
  levels: Level[];
  matchId: string;
  matchLog: Map[];
  players: User[];
  private: boolean;
  rated: boolean;
  type: MultiplayerMatchType;
  scoreTable: {
    [key: string]: number;
  };
  startTime: Date;
  state: MultiplayerMatchState;
  timeUntilStart: number; // virtual
  updatedAt: Date;
  winners: User[];
}

export default MultiplayerMatch;
