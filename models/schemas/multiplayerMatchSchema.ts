import mongoose, { ObjectId } from 'mongoose';
import cleanUser from '../../lib/cleanUser';
import Level from '../db/level';
import MultiplayerMatch from '../db/multiplayerMatch';
import User from '../db/user';
import {
  MatchAction,
  MatchLog,
  MatchLogDataFromUser,
  MatchLogDataGameRecap,
  MatchLogDataLevelComplete,
  MatchLogGeneric,
  MultiplayerMatchState,
  MultiplayerMatchType,
} from '../MultiplayerEnums';

export const SKIP_MATCH_LEVEL_ID = '000000000000000000000000';

export function generateMatchLog(type: MatchAction, data: MatchLogGeneric | MatchLogDataFromUser | MatchLogDataGameRecap | MatchLogDataLevelComplete ) {
  return {
    createdAt: new Date(),
    type: type,
    data: data,
  } as MatchLog;
}

const MultiplayerMatchSchema = new mongoose.Schema<MultiplayerMatch>(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endTime: {
      type: Date,
    },
    levels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level',
      },
    ],
    markedReady: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    matchId: {
      type: String,
      required: true,
      unique: true,
    },
    matchLog: {
      // array of MatchLog
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    private: {
      type: Boolean,
      required: true,
    },
    rated: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: MultiplayerMatchType,
      required: true,
    },
    gameTable: {
      type: Map,
      of: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Level',
        },
      ],
    },
    startTime: {
      type: Date,
    },
    state: {
      type: String,
      enum: MultiplayerMatchState,
      required: true,
    },
    winners:
      {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
      },

  },
  {
    timestamps: true,
  }
);

export function enrichMultiplayerMatch(
  match: MultiplayerMatch,
  userId?: string
) {
  match.startTime = new Date(match.startTime);
  match.endTime = new Date(match.endTime);
  match.timeUntilStart = match.startTime
    ? match.startTime.getTime() - Date.now()
    : 0;
  match.timeUntilEnd = match.endTime ? match.endTime.getTime() - Date.now() : 0;
  cleanUser(match.createdBy);

  for (const player of match.players) {
    cleanUser(player);
  }

  for (const winner of match.winners) {
    cleanUser(winner as User);
  }

  // replace each level[] object with levelsPopulated[] object
  // convert this to a map with _id as key
  const levelMap = new Map<string, Level>();

  if (match.levelsPopulated && match.levelsPopulated.length > 0) {
    for (const level of match.levelsPopulated) {
      levelMap.set(level._id.toString(), level);
    }

    match.levels?.forEach((level: unknown, index: number) => {
      match.levels[index] = levelMap.get((level as ObjectId).toString()) as Level;
      cleanUser((match.levels[index] as Level).userId);
    });
    match.levelsPopulated = []; // clear this out
  }

  const viewAccess = match.state === MultiplayerMatchState.FINISHED || !match.players.some(player => player._id.toString() === userId);

  if (!viewAccess) {
    if (Date.now() < match?.startTime?.getTime()) {
      match.levels = []; // hide levels until match starts
    } else if (userId && match.gameTable && match.gameTable[userId.toString()]) {
      // if user is in score table... then we should return the first level they have not solved

      const levelIndex = match.gameTable[userId.toString()].length || 0;

      match.levels = [match.levels[levelIndex]] as Level[];
    } else {
      match.levels = []; // hide levels if user is not in score table
    }
  }

  match.scoreTable = computeMatchScoreTable(match);

  if (!viewAccess) {
    match.gameTable = undefined; // hide the game table from the users
    match.matchLog = undefined;
  }

  return match;
}

export function computeMatchScoreTable(match: MultiplayerMatch) {
  const scoreTable = {} as {[key: string]: number};

  for (const tableEntry in match.gameTable) {
    // create the scoreboard by counting non nulls
    // filter out all zero objectIds
    scoreTable[tableEntry] = match.gameTable[tableEntry].filter(
      (level) => level.toString() !== SKIP_MATCH_LEVEL_ID
    ).length;
  }

  return scoreTable;
}

export default MultiplayerMatchSchema;

// create index for matchId
MultiplayerMatchSchema.index({ matchId: 1 });
// create index for state
MultiplayerMatchSchema.index({ state: 1 });
// create index for type
MultiplayerMatchSchema.index({ type: 1 });
