import { GameId } from '@root/constants/GameId';
import Role from '@root/constants/role';
import { Types } from 'mongoose';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  calcLevelsCompletedCount: number;
  calcLevelsCreatedCount: number;
  calcLevelsSolvedCount: number;
  calcRankedSolves: number;
  calcRecordsCount: number;
  chapterUnlocked: number;
  gameId: GameId;
  roles: Role[];
  mobileDeviceTokens: string[];
  showPlayStats: boolean;
  stripeCustomerId: string;
  stripeGiftSubscriptions: string[]; // gift subscriptions this user has given out
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId | User;
}

export default UserConfig;
