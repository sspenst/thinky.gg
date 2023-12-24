import { GameId } from '@root/constants/GameId';
import Role from '@root/constants/role';
import { Types } from 'mongoose';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  calcRankedSolves: number;
  calcLevelsCreatedCount: number;
  calcRecordsCount: number;
  chapterUnlocked: number;
  calcLevelsCompletedCount: number;
  calcLevelsSolvedCount: number;
  gameId: GameId;
  giftSubscriptions: string[]; // gift subscriptions this user has given out
  mobileDeviceTokens: string[];
  roles: Role[];
  showPlayStats: boolean;
  stripeCustomerId: string;
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId | User;
}

export default UserConfig;
