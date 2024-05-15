import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoReviewer extends IAchievementInfo {
  unlocked: ({ reviewsCreatedCount }: {reviewsCreatedCount: number}) => boolean;
}

const AchievementRulesReviewer: { [achievementType: string]: IAchievementInfoReviewer; } = {
  [AchievementType.REVIEWED_3000_LEVELS]: {
    name: 'Legendary Reviewer',
    emoji: '👑',
    getDescription: () => 'Reviewed 3000 levels',
    discordNotification: true,
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 3000,
  },
  [AchievementType.REVIEWED_1000_LEVELS]: {
    name: 'Master Critic',
    emoji: '🎭',
    getDescription: () => 'Reviewed 1000 levels',
    discordNotification: true,
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 1000,
  },
  [AchievementType.REVIEWED_500_LEVELS]: {
    name: 'Critic',
    emoji: '🍿',
    getDescription: () => 'Reviewed 500 levels',
    discordNotification: true,
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 500,
  },
  [AchievementType.REVIEWED_100_LEVELS]: {
    name: 'Reviewer',
    emoji: '📝',
    getDescription: () => 'Reviewed 100 levels',
    discordNotification: true,
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 100,
  },
  [AchievementType.REVIEWED_25_LEVELS]: {
    name: 'Commentator',
    emoji: '💬',
    getDescription: () => 'Reviewed 25 levels',
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 25,
  },
  [AchievementType.REVIEWED_1_LEVEL]: {
    name: 'Scribbler',
    emoji: '🖍️',
    getDescription: () => 'Reviewed a level',
    unlocked: ({ reviewsCreatedCount }) => reviewsCreatedCount >= 1,
  },
};

export default AchievementRulesReviewer;
