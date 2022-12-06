import mongoose from 'mongoose';
import MultiplayerProfile from '../db/multiplayerProfile';

const MultiplayerProfileSchema = new mongoose.Schema<MultiplayerProfile>(
  {
    calc_matches_count: {
      type: Number,
      default: 0,
    },
    rating: {
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
