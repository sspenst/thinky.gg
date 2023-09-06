import { DIFFICULTY_NAMES, getDifficultyList } from '@root/components/formatted/formattedDifficulty';
import { IAchievementInfo } from './achievementInfo';
import AchievementType from './achievementType';

export const difficultyList = getDifficultyList();

export interface IAchievementInfoLevelCompletion extends IAchievementInfo {
  unlocked: ({ rollingLevelCompletionSum }: {rollingLevelCompletionSum: number[]}) => boolean;
}
export const AchievementRulesTableLevelCompletion: { [achievementType: string]: IAchievementInfoLevelCompletion; } = {
  [AchievementType.PLAYER_RANK_KINDERGARTEN]: {
    name: 'Kindergarten',
    emoji: difficultyList[DIFFICULTY_NAMES.KINDERGARTEN].emoji,
    description: 'Completed 10 levels on Kindergarten difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_ELEMENTARY]: {
    name: 'Elementary',
    emoji: difficultyList[DIFFICULTY_NAMES.ELEMENTARY].emoji,
    description: 'Completed 25 levels on Elementary difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_JUNIOR_HIGH]: {
    name: 'Junior High',
    emoji: difficultyList[DIFFICULTY_NAMES.JUNIOR_HIGH].emoji,
    description: 'Completed 25 levels on Junior High difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_HIGH_SCHOOL]: {
    name: 'High Schooler',
    emoji: difficultyList[DIFFICULTY_NAMES.HIGH_SCHOOL].emoji,
    description: 'Completed 25 levels on High School difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_BACHELORS]: {
    name: 'Bachelor',
    emoji: difficultyList[DIFFICULTY_NAMES.BACHELORS].emoji,
    description: 'Completed 25 levels on Bachelor\'s difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_MASTERS]: {
    name: 'Master',
    emoji: difficultyList[DIFFICULTY_NAMES.MASTERS].emoji,
    description: 'Completed 10 levels on Master\'s difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PHD]: {
    name: 'PhD',
    emoji: difficultyList[DIFFICULTY_NAMES.PHD].emoji,
    description: 'Completed 10 levels on PhD difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PROFESSOR]: {
    name: 'Professor',
    emoji: difficultyList[DIFFICULTY_NAMES.PROFESSOR].emoji,
    description: 'Completed 10 levels on Professor difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_GRANDMASTER]: {
    name: 'Grandmaster',
    emoji: difficultyList[DIFFICULTY_NAMES.GRANDMASTER].emoji,
    description: 'Completed 7 levels on Grandmaster difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] >= 7;
    },
  },
  [AchievementType.PLAYER_RANK_SUPER_GRANDMASTER]: {
    name: 'Super Grandmaster',
    emoji: difficultyList[DIFFICULTY_NAMES.SUPER_GRANDMASTER].emoji,
    description: 'Completed 7 levels on Super Grandmaster difficulty',

    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
};
