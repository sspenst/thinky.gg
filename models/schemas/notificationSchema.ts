import mongoose from 'mongoose';
import Notification from '../db/notification';

const NotificationSchema = new mongoose.Schema<Notification>({
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
  type: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

export default NotificationSchema;
