import mongoose from 'mongoose';
import MultiplayerPlayer from '../db/multiplayerPlayer';

const MultiplayerPlayerSchema = new mongoose.Schema<MultiplayerPlayer>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // glicko2
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

export default MultiplayerPlayerSchema;
