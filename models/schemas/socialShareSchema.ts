import { GameId } from '@root/constants/GameId';
import mongoose from 'mongoose';
import SocialShare from '../db/socialShare';

const SocialShareSchema = new mongoose.Schema<SocialShare>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ['X', 'Facebook', 'LinkedIn', 'Reddit', 'Telegram'],
    },
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
SocialShareSchema.index({ userId: 1, gameId: 1 });
SocialShareSchema.index({ levelId: 1 });
SocialShareSchema.index({ platform: 1 });

export default SocialShareSchema;