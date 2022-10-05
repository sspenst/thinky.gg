import mongoose from 'mongoose';
import UserConfig from '../db/userConfig';

const UserConfigSchema = new mongoose.Schema<UserConfig>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    emailDigest: {
      type: String,
      required: true,
      enum: ['OnlyOnNotification', 'Daily', 'Never'],
      default: 'OnlyOnNotification',
    },
    sidebar: {
      type: Boolean,
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
    tutorialCompletedAt: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
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

UserConfigSchema.index({ userId: 1 }, { unique: true });

export default UserConfigSchema;
