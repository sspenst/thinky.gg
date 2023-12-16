import { EmailDigestSettingType } from '@root/constants/emailDigest';
import { GameId } from '@root/constants/GameId';
import { Types } from 'mongoose';
import Role from '../../constants/role';
import MultiplayerProfile from './multiplayerProfile';
import Notification from './notification';
import UserConfig from './userConfig';

interface User {
  _id: Types.ObjectId;
  avatarUpdatedAt?: number;
  bio?: string;
  //calcRankedSolves: number;
  //calc_levels_created_count: number;
 // calc_records: number;
 // chapterUnlocked?: number; // chapter unlocked in the campaign
  email: string;
  emailConfirmationToken: string;
  emailConfirmed: boolean;
  emailDigest: EmailDigestSettingType;
  hideStatus?: boolean;
  ip_addresses_used: string[];
  lastGame?: GameId;
  last_visited_at?: number; // last time user visited website
  name: string;
  password?: string;
  roles: Role[];
  //score: number;
  ts?: number; // created timestamp

  // virtual field
  config?: UserConfig;
}

export interface ReqUser extends User {
  config: UserConfig;
  multiplayerProfile?: MultiplayerProfile;
  notifications: Notification[];
}

export interface UserWithMultiplayerProfile extends User {
  multiplayerProfile?: MultiplayerProfile
}
export interface UserWithMultiMultiplayerProfile extends User {
  multiplayerProfile?: MultiplayerProfile[] | MultiplayerProfile
}

export default User;
