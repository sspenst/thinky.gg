import mongoose from 'mongoose';
import NotificationPushToken from '../db/notificationPushToken';

const NotificationPushTokenSchema = new mongoose.Schema<NotificationPushToken>(
  {
    deviceToken: {
      type: String,
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    deviceBrand: {
      type: String,
      required: true,
    },
    deviceOSName: {
      type: String,
      required: true,
    },
    deviceOSVersion: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default NotificationPushTokenSchema;

// unique on deviceToken
NotificationPushTokenSchema.index({ deviceToken: 1 }, { unique: true });

// index on userId
NotificationPushTokenSchema.index({ userId: 1 });
