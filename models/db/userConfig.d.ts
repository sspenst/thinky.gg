import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.userconfig collection
interface UserConfig {
  _id: Types.ObjectId;
  emailDigest: string;
  sidebar: boolean;
  theme: string;
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId & User;
}

export default UserConfig;
