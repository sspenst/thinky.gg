import mongoose from 'mongoose';
import cleanUser from '../../lib/cleanUser';
import MultiplayerMatch from '../db/multiplayerMatch';

export enum MultiplayerMatchType {
  ClassicRush = 'ClassicRush',
  // BlitzRush = 'BlitzRush', // TODO
  // BulletRush = 'BulletRush', // TODO
}
export enum MultiplayerMatchState {
  OPEN = 'OPEN',
  STARTING = 'STARTING',
  ACTIVE = 'ACTIVE',
  ABORTED = 'ABORTED',
  FINISHED = 'FINISHED',
}

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

export function enrichMultiplayerMatch(match: MultiplayerMatch) {
  match.timeUntilStart = match.startTime ? match.startTime.getTime() - Date.now() : 0;
  cleanUser(match.createdBy);

  for (const player of match.players) {
    cleanUser(player);
  }

  for (const winner of match.winners) {
    cleanUser(winner);
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
