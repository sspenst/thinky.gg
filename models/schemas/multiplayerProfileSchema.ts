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
    gameId: {
      type: String,
      required: false,
    },
    ratingRushBullet: {
      type: Number,
      required: true,
      default: 1000,
    },
    ratingRushBlitz: {
      type: Number,
      required: true,
      default: 1000,
    },
    ratingRushRapid: {
      type: Number,
      required: true,
      default: 1000,
    },
    ratingRushClassical: {
      type: Number,
      required: true,
      default: 1000,
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
