import { MULTIPLAYER_INITIAL_ELO } from '@root/helpers/multiplayerHelperFunctions';
import mongoose from 'mongoose';
import MultiplayerProfile from '../db/multiplayerProfile';

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
    ratingDeviation: {
      type: Number,
      required: true,
      default: 400,
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
MultiplayerProfileSchema.index({ userId: 1 }, { unique: true });
// index on rating
MultiplayerProfileSchema.index({ rating: 1 });

export default MultiplayerProfileSchema;
