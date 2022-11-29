import mongoose from 'mongoose';
import MultiplayerProfile from '../db/multiplayerProfile';

const MultiplayerProfileSchema = new mongoose.Schema<MultiplayerProfile>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // glicko2?
    rating: {
      type: Number,
      required: true,
      default: 1500,
    },
    ratingDeviation: {
      type: Number,
      required: true,
      default: 400,
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
MultiplayerProfileSchema.index({ userId: 1 });
// index on rating
MultiplayerProfileSchema.index({ rating: 1 });

export default MultiplayerProfileSchema;
