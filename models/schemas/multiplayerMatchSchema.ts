import mongoose from 'mongoose';
import cleanUser from '../../lib/cleanUser';
import MultiplayerMatch from '../db/multiplayerMatch';
import User from '../db/user';
import { MultiplayerMatchState, MultiplayerMatchType } from '../MultiplayerEnums';

export function generateMatchLog(who: mongoose.Types.ObjectId, log: string) {
  return {
    [Date.now()]: {
      who,
      log,
    },
  };
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
    levels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
    }],
    matchId: {
      type: String,
      required: true,
      unique: true,
    },
    matchLog: {
      type: [Map],
      required: true,
      select: false,
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    private: {
      type: Boolean,
      required: true,
    },
    rated: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: MultiplayerMatchType,
      required: true,
    },
    scoreTable: {
      type: Map,
      of: Number,
      default: {},
    },
    startTime: {
      type: Date,
    },
    state: {
      type: String,
      enum: MultiplayerMatchState,
      required: true,
    },
    winners: [{
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    }],
  },
  {
    timestamps: true,
  }
);

export function enrichMultiplayerMatch(match: MultiplayerMatch, user: User) {
  match.timeUntilStart = match.startTime ? match.startTime.getTime() - Date.now() : 0;
  match.timeUntilEnd = match.endTime ? match.endTime.getTime() - Date.now() : 0;
  cleanUser(match.createdBy);

  for (const player of match.players) {
    cleanUser(player);
  }

  for (const winner of match.winners) {
    cleanUser(winner);
  }

  if (Date.now() < match?.startTime?.getTime()) {
    match.levels = []; // hide levels until match starts
  }
  else if (match.scoreTable[user._id.toString()] !== undefined) {
    // if user is in score table... then we should return the first level they have not solved
    /*
      scoreTable looks like
      {
        'userId1': 0,
        'userId2': 1,
      }
    */
    const levelIndex = match.scoreTable[user._id.toString()];

    match.levels = [match.levels[levelIndex]];
  } else {
    match.levels = []; // hide levels if user is not in score table
  }

  return match;
}

export default MultiplayerMatchSchema;

// create index for matchId
MultiplayerMatchSchema.index({ matchId: 1 });
// create index for state
MultiplayerMatchSchema.index({ state: 1 });
// create index for type
MultiplayerMatchSchema.index({ type: 1 });
