import NotificationType from '@root/constants/notificationType';
import { TourType } from '@root/hooks/useTour';
import { Types } from 'mongoose';
import EmailDigestSettingTypes from '../../constants/emailDigest';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  gameId?: string;
  emailConfirmationToken: string;
  emailConfirmed: boolean;
  emailDigest: EmailDigestSettingTypes;
  emailNotificationsList: NotificationType[];
  giftSubscriptions: string[]; // gift subscriptions this user has given out
  mobileDeviceTokens: string[];
  pushNotificationsList: NotificationType[];
  showPlayStats: boolean;
  stripeCustomerId: string;
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId | User;
}

export default UserConfig;
