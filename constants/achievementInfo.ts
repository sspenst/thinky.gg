import { DIFFICULTY_NAMES } from '@root/components/formatted/formattedDifficulty';
import AchievementType from './achievementType';

// create an interface for the object that will be exported
export interface IAchievementInfo {
  name: string;
  description: string;
  exactlyUnlocked: (rollingLevelCompletionSum: number[]) => boolean;
  unlocked: (rollingLevelCompletionSum: number[]) => boolean;
}

const AchievementScoreInfo: {[achievementType: string]: IAchievementInfo} = {
  [AchievementType.PLAYER_RANK_KINDERGARTEN]: {
    name: 'Kindergarten',
    description: 'Completed 25 levels on Kindergarten difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] === 25;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.KINDERGARTEN] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_ELEMENTARY]: {
    name: 'Elementary',
    description: 'Completed 25 levels on Elementary difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] === 25;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.ELEMENTARY] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_JUNIOR_HIGH]: {
    name: 'Junior High',
    description: 'Completed 25 levels on Junior High difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] === 25;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.JUNIOR_HIGH] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_HIGH_SCHOOL]: {
    name: 'High School',
    description: 'Completed 25 levels on High School difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] === 25;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.HIGH_SCHOOL] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_BACHELORS]: {
    name: 'Bachelor\'s',
    description: 'Completed 25 levels on Bachelor\'s difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] === 25;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.BACHELORS] >= 25;
    },
  },
  [AchievementType.PLAYER_RANK_MASTERS]: {
    name: 'Master\'s',
    description: 'Completed 10 levels on Master\'s difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] === 10;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.MASTERS] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PHD]: {
    name: 'PhD',
    description: 'Completed 10 levels on PhD difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] === 10;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PHD] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_PROFESSOR]: {
    name: 'Professor',
    description: 'Completed 10 levels on Professor difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] === 10;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.PROFESSOR] >= 10;
    },
  },
  [AchievementType.PLAYER_RANK_GRANDMASTER]: {
    name: 'Grandmaster',
    description: 'Completed 7 levels on Grandmaster difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] + rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] === 7;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.GRANDMASTER] + rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  [AchievementType.PLAYER_RANK_SUPER_GRANDMASTER]: {
    name: 'Super Grandmaster',
    description: 'Completed 7 levels on Super Grandmaster difficulty',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] === 7;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[DIFFICULTY_NAMES.SUPER_GRANDMASTER] >= 7;
    },
  },
  [AchievementType.COMPLETED_LEVELS_100]: {
    name: 'Getting Started',
    description: 'Completed 100 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 100;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 100;
    },

  },
  [AchievementType.COMPLETED_LEVELS_500]: {
    name: 'Getting the Hang of It',
    description: 'Completed 500 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 500;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 500;
    }

  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    name: 'Getting Good',
    description: 'Completed 1000 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 1000;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 1000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    name: 'Getting Great',
    description: 'Completed 2000 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 2000;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 2000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    name: 'Getting Amazing',
    description: 'Completed 3000 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 3000;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 3000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    name: 'Getting Incredible',
    description: 'Completed 4000 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 4000;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 4000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_5000]: {
    name: 'Getting Unbelievable',
    description: 'Completed 5000 levels',
    exactlyUnlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] === 5000;
    },
    unlocked: (rollingLevelCompletionSum: number[]) => {
      return rollingLevelCompletionSum[0] >= 5000;
    }

  },
};

export default AchievementScoreInfo;
