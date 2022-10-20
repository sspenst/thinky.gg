import { Types } from 'mongoose';
import EmailDigestSettingTypes from '../../constants/emailDigest';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  emailDigest: EmailDigestSettingTypes;
  sidebar: boolean;
  theme: string;
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId & User;
}

export default UserConfig;
