import { GameId } from '@root/constants/GameId';
import Role from '@root/constants/role';
import TourType from '@root/constants/tourType';
import { Types } from 'mongoose';
import User from './user';

interface UserConfig {
  _id: Types.ObjectId;
  calcLevelsCompletedCount: number;
  calcLevelsCreatedCount: number;
  calcLevelsSolvedCount: number;
  calcRankedSolves: number;
  calcRecordsCount: number;
  calcCurrentStreak: number;
  lastPlayedAt?: number; // represents the timestamp they last played a level
  chapterUnlocked: number;
  customTheme: string;
  gameId: GameId;
  roles: Role[];
  theme: string;
  toursCompleted: TourType[];
  tutorialCompletedAt: number; // represents the timestamp they completed the tutorial
  userId: Types.ObjectId | User;
}

export default UserConfig;
