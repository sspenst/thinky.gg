import mongoose from 'mongoose';
import Device from '../db/device';

export enum DeviceState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
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
    state: {
      type: String,
      enum: Object.values(DeviceState),
      default: DeviceState.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

export default DeviceSchema;

DeviceSchema.index({ userId: 1, deviceToken: 1 }, { unique: true });
