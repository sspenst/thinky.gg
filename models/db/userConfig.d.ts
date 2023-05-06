import NotificationType from '@root/constants/notificationType';
import { TourType } from '@root/hooks/useTour';
import { Types } from 'mongoose';
import EmailDigestSettingTypes, { EmailType } from '../../constants/emailDigest';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  emailConfirmationToken: string;
  emailConfirmed: boolean;
  emailDigest: EmailDigestSettingTypes;
  emailNotificationsList: NotificationType[];
  pushNotificationsList: NotificationType[];
  mobileDeviceTokens: string[];
  showPlayStats: boolean;
  stripeCustomerId: string;
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId & User;
}

export default UserConfig;
