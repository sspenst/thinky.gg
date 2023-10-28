import NotificationType from '@root/constants/notificationType';
import { TourType } from '@root/constants/tourType';
import mongoose from 'mongoose';
import { EmailDigestSettingTypes } from '../../constants/emailDigest';
import UserConfig from '../db/userConfig';

const UserConfigSchema = new mongoose.Schema<UserConfig>(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    disallowedEmailNotifications: {
      type: [{ type: String, enum: NotificationType }],
      required: true,
      default: [],
    },
    disallowedPushNotifications: {
      type: [{ type: String, enum: NotificationType }],
      required: true,
      default: [],
    },
    emailConfirmationToken: {
      type: String,
      select: false,
    },
    emailConfirmed: {
      type: Boolean,
      default: false,
    },
    emailDigest: {
      type: String,
      required: true,
      enum: EmailDigestSettingTypes,
      default: EmailDigestSettingTypes.DAILY,
    },
    giftSubscriptions: {
      type: [String],
      required: false,
      select: false,
      default: [],
    },
    mobileDeviceTokens: {
      type: [String],
      required: false,
      select: false,
      default: [],
      maxlength: 100, // max 100 devices @TODO: should probably 'rotate' this list and remove oldest device tokens on push of new one
    },
    showPlayStats: {
      type: Boolean,
      default: false,
    },
    stripeCustomerId: {
      type: String,
      required: false,
      select: false,
    },
    theme: {
      type: String,
      required: true,
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
