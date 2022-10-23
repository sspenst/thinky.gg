import { Types } from 'mongoose';
import Role from '../../constants/role';
import Notification from './notification';

interface User {
  _id: Types.ObjectId;
  avatarUpdatedAt?: number;
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
  notifications: Notification[];
}

export default User;
