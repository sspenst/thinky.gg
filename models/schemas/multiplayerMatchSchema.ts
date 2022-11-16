import mongoose from 'mongoose';
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

export default MultiplayerMatchSchema;

// create a virtual field for timeUntilStart
MultiplayerMatchSchema.virtual('timeUntilStart').get(function () {
  if (this.startTime) {
    return this.startTime.getTime() - Date.now();
  }
});

// create index for matchId
MultiplayerMatchSchema.index({ matchId: 1 });
// create index for state
MultiplayerMatchSchema.index({ state: 1 });
// create index for type
MultiplayerMatchSchema.index({ type: 1 });
