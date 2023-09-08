import Level from '@root/models/db/level';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export interface IAchievementInfoCreator extends IAchievementInfo {
  unlocked: ({ levelsCreated }: {levelsCreated: Level[]}) => boolean;
}

export const AchievementRulesTableCreator: { [achievementType: string]: IAchievementInfoCreator; } = {
  [AchievementType.CREATOR_CREATED_25_HIGH_QUALITY_LEVELS]: {
    name: 'Masterpiece Maker',
    emoji: '🎻',
    description: 'Created 25 acclaimed levels',
    unlocked: ({ levelsCreated }) => {
      const highQualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.93);

      return highQualityLevels.length >= 25;
    }
  },
  [AchievementType.CREATOR_CREATED_10_HIGH_QUALITY_LEVELS]: {
    name: 'Artist',
    emoji: '🎨',
    description: 'Created 10 acclaimed levels',
    unlocked: ({ levelsCreated }) => {
      const highQualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.93);

      return highQualityLevels.length >= 10;
    },
  },
  [AchievementType.CREATOR_CREATED_1_HIGH_QUALITY_LEVEL]: {
    name: 'Stroke of Genius',
    emoji: '🖌️',
    description: 'Created an acclaimed level',
    unlocked: ({ levelsCreated }) => {
      const highQualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.93);

      return highQualityLevels.length >= 10;
    },
  },
  [AchievementType.CREATOR_CREATED_300_LEVELS]: {
    name: 'Visionary Architect',
    emoji: '🏯',
    description: 'Created 300 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 300;
    },
  },
  [AchievementType.CREATOR_CREATED_200_LEVELS]: {
    name: 'Master Architect',
    emoji: '🏯',
    description: 'Created 200 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 200;
    },
  },
  [AchievementType.CREATOR_CREATED_100_LEVELS]: {
    name: 'Architect',
    emoji: '🏛️',
    description: 'Created 100 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 100;
    },
  },
  [AchievementType.CREATOR_CREATED_50_LEVELS]: {
    name: 'Engineer',
    emoji: '📐',
    description: 'Created 50 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 50;
    },
  },
  [AchievementType.CREATOR_CREATED_25_LEVELS]: {
    name: 'Developer',
    emoji: '🏘',
    description: 'Created 25 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 25;
    },
  },
  [AchievementType.CREATOR_CREATED_10_LEVELS]: {
    name: 'Builder',
    emoji: '🏗️',
    description: 'Created 10 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 10;
    },
  },
  [AchievementType.CREATOR_CREATED_5_LEVELS]: {
    name: 'Apprentice',
    emoji: '🛠️',
    description: 'Created 5 quality levels',
    unlocked: ({ levelsCreated }) => {
      const qualityLevels = levelsCreated.filter(l => l.calc_reviews_score_laplace > 0.66 && l.calc_reviews_count >= 3);

      return qualityLevels.length >= 5;
    },
  },
  [AchievementType.CREATOR_CREATED_1_LEVEL]: {
    name: 'Handyman',
    emoji: '🔧',
    description: 'Created your first level',
    unlocked: ({ levelsCreated }) => levelsCreated.length >= 1,
  },
};
