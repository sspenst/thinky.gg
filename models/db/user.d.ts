import { Types } from 'mongoose';
import Role from '../../constants/role';
import MultiplayerProfile from './multiplayerPlayer';
import Notification from './notification';
import UserConfig from './userConfig';

interface User {
  _id: Types.ObjectId;
  avatarUpdatedAt?: number;
  bio?: string;
  calc_records: number;
  email: string;
  hideStatus?: boolean;
  ip_addresses_used: string[];
  last_visited_at?: number; // last time user visited website
  name: string;
  password?: string;
  roles: Role[];
  score: number;
  ts?: number; // created timestamp
}

export interface ReqUser extends User {
  config: UserConfig;
  notifications: Notification[];
}

export interface UserWithMultiplayerProfile extends User {
  multiplayerProfile?: MultiplayerProfile
}

export default User;
