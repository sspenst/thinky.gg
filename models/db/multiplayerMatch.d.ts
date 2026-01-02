import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import { MatchLog, MultiplayerMatchState, MultiplayerMatchType } from '../constants/multiplayer';
import Level from './level';
import User, { UserWithMultiplayerProfile } from './user';

export interface ChatMessage {
  userId: Types.ObjectId | User | null; // null for system messages
  message: string;
  createdAt: Date;
  systemData?: any; // Optional structured data for system messages
}

interface MultiplayerMatch {
  _id: Types.ObjectId;
  createdAt: Date;
  createdBy: User;
  endTime: Date;
  gameId: GameId;
  gameTable?: Record<string, Level[]>;
  levels: Level[] | Types.ObjectId[];
  levelsPopulated: Level[]; // virtual
  markedReady: Types.ObjectId[] | User[] | string[];
  matchId: string;
  matchLog?: MatchLog[];
  chatMessages: ChatMessage[];
  players: UserWithMultiplayerProfile[];
  private: boolean;
  rated: boolean;
  scoreTable: Record<string, number>;
  startTime: Date;
  state: MultiplayerMatchState;
  timeUntilStart: number; // virtual
  timeUntilEnd: number; // virtual
  type: MultiplayerMatchType;
  updatedAt: Date;
  winners: User[] | Types.ObjectId[];
}

export default MultiplayerMatch;
