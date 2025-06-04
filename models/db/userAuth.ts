import { Types } from 'mongoose';
import User from './user';

export enum AuthProvider {
  DISCORD = 'discord',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
}

interface UserAuth {
  _id: Types.ObjectId;
  userId: Types.ObjectId & User;
  provider: AuthProvider;
  providerId: string;
  providerUsername?: string;
  providerEmail?: string;
  providerAvatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  connectedAt: number;
  updatedAt: number;
}

export default UserAuth;
