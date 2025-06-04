import { Types } from 'mongoose';

export enum AuthProvider {
  DISCORD = 'discord',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
}

interface UserAuth {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
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
