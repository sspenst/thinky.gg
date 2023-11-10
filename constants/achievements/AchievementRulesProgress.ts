import User from '@root/models/db/user';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

interface IAchievementInfoUser extends IAchievementInfo {
  unlocked: ({ user }: { user: User; }) => boolean;
}

const AchievementRulesProgress: { [achievementType: string]: IAchievementInfoUser; } = {
  [AchievementType.SOLVED_LEVELS_5000]: {
    name: 'Legend',
    emoji: '🐉',
    description: 'Solved 5000 levels',
    unlocked: ({ user }) => user.score >= 5000,
  },
  [AchievementType.SOLVED_LEVELS_4000]: {
    name: 'Ludicrous',
    emoji: '💥',
    description: 'Solved 4000 levels',
    unlocked: ({ user }) => user.score >= 4000,
  },
  [AchievementType.SOLVED_LEVELS_3000]: {
    name: 'Obsessed',
    emoji: '🚀',
    description: 'Solved 3000 levels',
    unlocked: ({ user }) => user.score >= 3000,
  },
  [AchievementType.SOLVED_LEVELS_2000]: {
    name: 'Addicted',
    emoji: '🎯',
    description: 'Solved 2000 levels',
    unlocked: ({ user }) => user.score >= 2000,
  },
  [AchievementType.SOLVED_LEVELS_1000]: {
    name: 'Experienced',
    emoji: '🎖️',
    description: 'Solved 1000 levels',
    unlocked: ({ user }) => user.score >= 1000,
  },
  [AchievementType.SOLVED_LEVELS_500]: {
    name: 'We\'re serious',
    emoji: '🏆',
    description: 'Solved 500 levels',
    unlocked: ({ user }) => user.score >= 500,
  },
  [AchievementType.SOLVED_LEVELS_100]: {
    name: 'Getting Started',
    emoji: '🏁',
    description: 'Solved 100 levels',
    unlocked: ({ user }) => user.score >= 100,
  },
};

export default AchievementRulesProgress;
