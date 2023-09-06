import Level from '@root/models/db/level';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export interface IAchievementInfoCreator extends IAchievementInfo {
  unlocked: ({ levelsCreated }: {levelsCreated: Level[]}) => boolean;
}
export const AchievementRulesTableCreator: { [achievementType: string]: IAchievementInfoCreator; } = {
  [AchievementType.CREATOR_CREATED_1_LEVEL]: {
    name: 'Handyman',
    emoji: '🔧',
    description: 'Created your first level',
    unlocked: ({ levelsCreated }) => {
      return levelsCreated.length >= 1;
    },
  },
  [AchievementType.CREATOR_CREATED_5_LEVELS]: {
    name: 'Apprentice',
    emoji: '🛠️',
    description: 'Created 5 quality levels',
    unlocked: ({ levelsCreated }) => {
      // filter for calc_reviews_score_laplace > 0.5
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 5;
    },
  },

  // now one for creating 10 levels, maybe call them a builder
  [AchievementType.CREATOR_CREATED_10_LEVELS]: {
    name: 'Builder',
    emoji: '🏗️',
    description: 'Created 10 quality levels',

    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 10;
    },
  },
  // now one for creating 10 levels, maybe call them a builder
  [AchievementType.CREATOR_CREATED_25_LEVELS]: {
    name: 'Developer',
    emoji: '🏘',
    description: 'Created quality 25 levels',

    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 25;
    },
  },
  // now one for creating 50 levels, maybe call them an architect
  [AchievementType.CREATOR_CREATED_50_LEVELS]: {
    name: 'Engineer',
    emoji: '📐',
    description: 'Created 50 quality levels',

    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 50;
    },
  },
  [AchievementType.CREATOR_CREATED_100_LEVELS]: {
    name: 'Architect',
    emoji: '🏛️',
    description: 'Created 100 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 100;
    },
  },
  [AchievementType.CREATOR_CREATED_200_LEVELS]: {
    name: 'Master Architect',
    emoji: '🏯',
    description: 'Created 200 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 200;
    },
  },
  [AchievementType.CREATOR_CREATED_300_LEVELS]: {
    name: 'Visionary Architect',
    emoji: '🏯',
    description: 'Created 300 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.5);

      return qualityLevels.length >= 300;
    },
  },
};
