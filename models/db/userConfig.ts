import { Types } from 'mongoose';
import User from './user';

// represents a document from the pathology.userconfig collection
interface UserConfig {
  _id: Types.ObjectId;
  sidebar: boolean;
  theme: string;
  userId: Types.ObjectId & User;
}

export default UserConfig;
