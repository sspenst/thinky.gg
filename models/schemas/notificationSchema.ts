import mongoose from 'mongoose';
import Notification from '../db/notification';

const NotificationSchema = new mongoose.Schema<Notification>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  source: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel',
    required: true,
  },
  sourceModel: {
    type: String,
    required: true,
    enum: ['User', 'Level'],
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: true,
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['User', 'Level'],
  },
  message: {
    type: String,
    required: false,
    default: '',
  },
  read: {
    type: Boolean,
    required: true,
    default: false,
  },
  type: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export default NotificationSchema;
