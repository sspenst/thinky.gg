import mongoose from 'mongoose';
import MultiplayerMatch, { MultiplayerMatchState, MultiplayerMatchType } from '../db/multiplayerMatch';

const MultiplayerMatchSchema = new mongoose.Schema<MultiplayerMatch>(
  {
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
      type: [String],
      required: true,
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
    type: {
      type: String,
      enum: MultiplayerMatchType,
      required: true,
    },
    scoreTable: {
      type: Map,
      of: Number,
      required: true,
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
    }],
  },
  {
    timestamps: true,
  }
);

export default MultiplayerMatchSchema;
