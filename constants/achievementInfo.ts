import AchievementType from './achievementType';

const AchievementInfo: {[achievementType: string]: {
  description: string;
  // TODO: can add more properties here (image src, unlock requirement, etc)
}} = {
  [AchievementType.COMPLETED_LEVELS_100]: {
    description: 'Completed 100 levels',
  },
  [AchievementType.COMPLETED_LEVELS_500]: {
    description: 'Completed 500 levels',
  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    description: 'Completed 1000 levels',
  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    description: 'Completed 2000 levels',
  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    description: 'Completed 3000 levels',
  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    description: 'Completed 4000 levels',
  },
};

export default AchievementInfo;
