import User from '@root/models/db/user';
import AchievementType from './achievementType';

const AchievementInfo: {[achievementType: string]: {
  description: string;
  exactlyUnlocked: (user: User) => boolean;
  unlocked: (user: User) => boolean;
  // TODO: can add more properties here (image src, unlock requirement, etc)
}} = {
  [AchievementType.COMPLETED_LEVELS_100]: {
    description: 'Completed 100 levels',
    exactlyUnlocked: user => user.score === 100,
    unlocked: user => user.score >= 100,
  },
  [AchievementType.COMPLETED_LEVELS_500]: {
    description: 'Completed 500 levels',
    exactlyUnlocked: user => user.score === 500,
    unlocked: user => user.score >= 500,
  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    description: 'Completed 1000 levels',
    exactlyUnlocked: user => user.score === 1000,
    unlocked: user => user.score >= 1000,
  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    description: 'Completed 2000 levels',
    exactlyUnlocked: user => user.score === 2000,
    unlocked: user => user.score >= 2000,
  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    description: 'Completed 3000 levels',
    exactlyUnlocked: user => user.score === 3000,
    unlocked: user => user.score >= 3000,
  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    description: 'Completed 4000 levels',
    exactlyUnlocked: user => user.score === 4000,
    unlocked: user => user.score >= 4000,
  },
  [AchievementType.COMPLETED_LEVELS_5000]: {
    description: 'Completed 5000 levels',
    exactlyUnlocked: user => user.score === 5000,
    unlocked: user => user.score >= 5000,
  },
};

export default AchievementInfo;
