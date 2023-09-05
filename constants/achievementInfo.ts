import { DIFFICULTY_NAMES, getDifficultyFromValue } from '@root/components/formatted/formattedDifficulty';
import User from '@root/models/db/user';
import AchievementType from './achievementType';

// create an interface for the object that will be exported
export interface IAchievementInfoFeatures {
  user: User;
  rollingLevelCompletionSum: number[];
}
export interface IAchievementInfo {
  name: string;
  emoji?: string;
  description: string;
  exactlyUnlocked: (features: IAchievementInfoFeatures) => boolean;
  unlocked: (features: IAchievementInfoFeatures) => boolean;
}

const AchievementRulesTable: {[achievementType: string]: IAchievementInfo} = {
  [AchievementType.PLAYER_RANK_KINDERGARTEN]: {
    name: 'Kindergarten',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.KINDERGARTEN).emoji,
    description: 'Completed 10 levels on Kindergarten difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] === 10;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_ELEMENTARY]: {
    name: 'Elementary',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.ELEMENTARY).emoji,
    description: 'Completed 25 levels on Elementary difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] === 25;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_JUNIOR_HIGH]: {
    name: 'Junior High',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.JUNIOR_HIGH).emoji,
    description: 'Completed 25 levels on Junior High difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] === 25;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_HIGH_SCHOOL]: {
    name: 'High Schooler',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.HIGH_SCHOOL).emoji,
    description: 'Completed 25 levels on High School difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] === 25;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_BACHELORS]: {
    name: 'Bachelor',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.BACHELORS).emoji,
    description: 'Completed 25 levels on Bachelor\'s difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] === 25;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_MASTERS]: {
    name: 'Master',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.MASTERS).emoji,
    description: 'Completed 10 levels on Master\'s difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] === 10;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PHD]: {
    name: 'PhD',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.PHD).emoji,
    description: 'Completed 10 levels on PhD difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] === 10;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PROFESSOR]: {
    name: 'Professor',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.PROFESSOR).emoji,
    description: 'Completed 10 levels on Professor difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] === 10;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_GRANDMASTER]: {
    name: 'Grandmaster',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.GRANDMASTER).emoji,
    description: 'Completed 7 levels on Grandmaster difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] + rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] === 7;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] + rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  [AchievementType.PLAYER_RANK_SUPER_GRANDMASTER]: {
    name: 'Super Grandmaster',
    emoji: getDifficultyFromValue(DIFFICULTY_NAMES.SUPER_GRANDMASTER).emoji,
    description: 'Completed 7 levels on Super Grandmaster difficulty',
    exactlyUnlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] === 7;
    },
    unlocked: ({ rollingLevelCompletionSum }) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  // Now for the score achievements
  [AchievementType.COMPLETED_LEVELS_100]: {
    name: 'Getting Started',
    emoji: '🏁',
    description: 'Completed 100 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 100;
    },
    unlocked: ({ user }) => {
      return user.score >= 100;
    },

  },
  [AchievementType.COMPLETED_LEVELS_500]: {
    name: 'We\'re serious',
    // choose an emoji  that represents the achievement (not a duplicate)
    emoji: '👀',
    description: 'Completed 500 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 500;
    },
    unlocked: ({ user }) => {
      return user.score >= 500;
    }

  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    name: 'Getting Good',
    emoji: '🫢',
    description: 'Completed 1000 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 1000;
    },
    unlocked: ({ user }) => {
      return user.score >= 1000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    name: 'Getting Great',
    emoji: '🤭',
    description: 'Completed 2000 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 2000;
    },
    unlocked: ({ user }) => {
      return user.score >= 2000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    name: 'Getting Amazing',
    emoji: '🙊',
    description: 'Completed 3000 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 3000;
    },
    unlocked: ({ user }) => {
      return user.score >= 3000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    name: 'Getting Incredible',
    emoji: '‼️',
    description: 'Completed 4000 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 4000;
    },
    unlocked: ({ user }) => {
      return user.score >= 4000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_5000]: {
    name: 'Getting Legendary',
    emoji: '🐉',
    description: 'Completed 5000 levels',
    exactlyUnlocked: ({ user }) => {
      return user.score === 5000;
    },
    unlocked: ({ user }) => {
      return user.score >= 5000;
    }

  },
};

export default AchievementRulesTable;
