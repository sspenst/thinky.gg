import { GameId } from '@root/constants/GameId';
import Role from '@root/constants/role';
import TourType from '@root/constants/tourType';
import mongoose from 'mongoose';
import UserConfig from '../db/userConfig';

const UserConfigSchema = new mongoose.Schema<UserConfig>(
  {
    calcLevelsCompletedCount: {
      type: Number,
      default: 0,
    },
    calcLevelsCreatedCount: {
      type: Number,
      default: 0,
    },
    calcLevelsSolvedCount: {
      type: Number,
      default: 0,
    },
    calcRankedSolves: {
      type: Number,
      required: true,
      default: 0,
    },
    calcRecordsCount: {
      type: Number,
      default: 0,
    },
    chapterUnlocked: {
      type: Number,
      default: 1,
    },
    gameId: {
      type: String,
      enum: GameId,
      required: true,
    },
    roles: {
      type: [String],
      enum: Role,
      default: [],
    },
    showPlayStats: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      required: true,
    },
    customTheme: {
      type: String,
      required: false,
    },
    toursCompleted: {
      type: [{ type: String, enum: TourType }],
      required: false,
      default: [],
    },
    tutorialCompletedAt: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collation: {
      locale: 'en_US',
      strength: 2,
    },
  }
);

UserConfigSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export default UserConfigSchema;
