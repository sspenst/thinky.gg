import User from './user';

interface Device {
  _id: Types.ObjectId;
  createdAt: Date;
  deviceBrand: string;
  deviceToken: string;
  deviceName: string;
  deviceOSName: string;
  deviceOSVersion: string;
  updatedAt: Date;
  userId: Types.ObjectId & User;
}

export default Device;
