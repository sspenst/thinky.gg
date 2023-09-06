import Review from '@root/models/db/review';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export interface IAchievementInfoReviewer extends IAchievementInfo{
  unlocked: ({ reviewsCreated }: {reviewsCreated: Review[]}) => boolean;
}
export const AchievementRulesTableReviewer: { [achievementType: string]: IAchievementInfoReviewer; } = {
  [AchievementType.REVIEWED_1_LEVEL]: {
    name: 'Scribbler',
    emoji: '🖍️',
    description: 'Reviewed a level',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 1;
    }
  },
  [AchievementType.REVIEWED_25_LEVELS]: {
    name: 'Commentator',
    emoji: '💬',
    description: 'Reviewed 25 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 25;
    }
  },
  [AchievementType.REVIEWED_100_LEVELS]: {
    name: 'Reviewer',
    emoji: '📝',
    description: 'Reviewed 100 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 100;
    }
  },
  [AchievementType.REVIEWED_500_LEVELS]: {
    name: 'Critic',
    emoji: '🍿',
    description: 'Reviewed 50 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 500;
    }
  },
  [AchievementType.REVIEWED_1000_LEVELS]: {
    name: 'Master Critic',
    emoji: '🎭',
    description: 'Reviewed 500 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 1000;
    }
  },
  [AchievementType.REVIEWED_3000_LEVELS]: {
    name: 'Legendary Reviewer',
    emoji: '👑',
    description: 'Reviewed 3000 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 3000;
    }
  },
};