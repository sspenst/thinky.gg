import mongoose from 'mongoose';
import Device from '../db/device';

const DeviceSchema = new mongoose.Schema<Device>(
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

export default DeviceSchema;

DeviceSchema.index({ deviceToken: 1 }, { unique: true });
DeviceSchema.index({ userId: 1 });
