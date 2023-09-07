import User from '@root/models/db/user';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export const AchievementRulesTableUser: { [achievementType: string]: IAchievementInfoUser; } = {
  [AchievementType.COMPLETED_LEVELS_100]: {
    name: 'Getting Started',
    emoji: '🏁',
    description: 'Completed 100 levels',

    unlocked: ({ user }) => {
      return user.score >= 100;
    },
  },
  [AchievementType.COMPLETED_LEVELS_500]: {
    name: 'We\'re serious',
    // choose an emoji  that represents the achievement (not a duplicate)
    emoji: '🏆',
    description: 'Completed 500 levels',

    unlocked: ({ user }) => {
      return user.score >= 500;
    }
  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    name: 'Experienced',
    emoji: '🏅',
    description: 'Completed 1000 levels',

    unlocked: ({ user }) => {
      return user.score >= 1000;
    }
  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    name: 'Addicted',
    emoji: '🎯',
    description: 'Completed 2000 levels',

    unlocked: ({ user }) => {
      return user.score >= 2000;
    }
  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    name: 'Obsessed',
    emoji: '🚀',
    description: 'Completed 3000 levels',

    unlocked: ({ user }) => {
      return user.score >= 3000;
    }
  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    name: 'Ludicrous',
    emoji: '💥',
    description: 'Completed 4000 levels',

    unlocked: ({ user }) => {
      return user.score >= 4000;
    }
  },
  [AchievementType.COMPLETED_LEVELS_5000]: {
    name: 'Legend',
    emoji: '🐉',
    description: 'Completed 5000 levels',

    unlocked: ({ user }) => {
      return user.score >= 5000;
    }
  },
}; export interface IAchievementInfoUser extends IAchievementInfo {
  unlocked: ({ user }: { user: User; }) => boolean;
}
