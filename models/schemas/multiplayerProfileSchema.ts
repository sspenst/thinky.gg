import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import MultiplayerProfile from '../db/multiplayerProfile';

export const MULTIPLAYER_INITIAL_ELO = 1000;

const MultiplayerProfileSchema = new mongoose.Schema<MultiplayerProfile>(
  {
    calcRushClassicalCount: {
      type: Number,
      required: true,
      default: 0,
    },
    calcRushBulletCount: {
      type: Number,
      required: true,
      default: 0,
    },
    calcRushBlitzCount: {
      type: Number,
      required: true,
      default: 0,
    },
    calcRushRapidCount: {
      type: Number,
      required: true,
      default: 0,
    },
    gameId: {
      type: String,
      enum: GameId,
      required: false,
    },
    ratingDeviation: {
      type: Number,
      required: true,
      default: 400,
    },
    ratingRushBullet: {
      type: Number,
      required: true,
      default: MULTIPLAYER_INITIAL_ELO,
    },
    ratingRushBlitz: {
      type: Number,
      required: true,
      default: MULTIPLAYER_INITIAL_ELO,
    },
    ratingRushRapid: {
      type: Number,
      required: true,
      default: MULTIPLAYER_INITIAL_ELO,
    },
    ratingRushClassical: {
      type: Number,
      required: true,
      default: MULTIPLAYER_INITIAL_ELO,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    volatility: {
      type: Number,
      required: true,
      default: 0.06,
    },
  },
  {
    timestamps: true,
  }
);

// index on userId
MultiplayerProfileSchema.index({ userId: 1, gameId: 1 }, { unique: true });
// index on rating
MultiplayerProfileSchema.index({ rating: 1 });

export default MultiplayerProfileSchema;
