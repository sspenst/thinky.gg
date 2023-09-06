import { DIFFICULTY_NAMES, getDifficultyList } from '@root/components/formatted/formattedDifficulty';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import Review from '@root/models/db/review';
import User from '@root/models/db/user';
import AchievementType from './achievementType';

export interface IAchievementInfo {
  name: string;
  emoji?: string;
  description: string;

}

export interface IAchievementInfoLevelCompletion extends IAchievementInfo {
  unlocked: ({ rollingLevelCompletionSum }: {rollingLevelCompletionSum: number[]}) => boolean;
}
export interface IAchievementInfoUser extends IAchievementInfo {
  unlocked: ({ user }: {user: User}) => boolean;
}
export interface IAchievementInfoCreator extends IAchievementInfo {
  unlocked: ({ levelsCreated }: {levelsCreated: Level[]}) => boolean;
}
export interface IAchievementInfoReviewer extends IAchievementInfo{
  unlocked: ({ reviewsCreated }: {reviewsCreated: Review[]}) => boolean;
}

export interface IAchievementInfoMultiplayer extends IAchievementInfo{
  unlocked: ({ userMatches }: { userMatches: MultiplayerMatch[]}) => boolean;
}

export const AchievementRulesTableMultiplayer: {[achievementType: string]: IAchievementInfoMultiplayer} = {
  [AchievementType.MULTIPLAYER_1_GAME_PLAYED]: {
    name: 'First Game',
    emoji: '🎮',
    description: 'Played a rated multiplayer match',
    unlocked: ({ userMatches }) => {
      return userMatches.length >= 1;
    }
  },
};
export const AchievementRulesTableReviewer: {[achievementType: string]: IAchievementInfoReviewer} = {
  [AchievementType.REVIEWED_1_LEVEL]: {
    name: 'Scribbler',
    emoji: '🖍️',
    description: 'Reviewed a level',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 1;
    }
  },
  [AchievementType.REVIEWED_25_LEVELS]: {
    name: 'Commentator',
    emoji: '💬',
    description: 'Reviewed 25 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 25;
    }
  },
  [AchievementType.REVIEWED_100_LEVELS]: {
    name: 'Reviewer',
    emoji: '📝',
    description: 'Reviewed 100 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 100;
    }
  },
  [AchievementType.REVIEWED_500_LEVELS]: {
    name: 'Critic',
    emoji: '🍿',
    description: 'Reviewed 50 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 500;
    }
  },
  [AchievementType.REVIEWED_1000_LEVELS]: {
    name: 'Master Critic',
    emoji: '🎭',
    description: 'Reviewed 500 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 1000;
    }
  },
  [AchievementType.REVIEWED_3000_LEVELS]: {
    name: 'Legendary Reviewer',
    emoji: '👑',
    description: 'Reviewed 3000 levels',
    unlocked: ({ reviewsCreated }) => {
      return reviewsCreated.length >= 3000;
    }
  },

};

export const AchievementRulesTableUser: {[achievementType: string]: IAchievementInfoUser} = {
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
    emoji: '👀',
    description: 'Completed 500 levels',

    unlocked: ({ user }) => {
      return user.score >= 500;
    }

  },
  [AchievementType.COMPLETED_LEVELS_1000]: {
    name: 'Getting Good',
    emoji: '🫢',
    description: 'Completed 1000 levels',

    unlocked: ({ user }) => {
      return user.score >= 1000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_2000]: {
    name: 'Getting Great',
    emoji: '🤭',
    description: 'Completed 2000 levels',

    unlocked: ({ user }) => {
      return user.score >= 2000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_3000]: {
    name: 'Getting Amazing',
    emoji: '🙊',
    description: 'Completed 3000 levels',

    unlocked: ({ user }) => {
      return user.score >= 3000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_4000]: {
    name: 'Getting Incredible',
    emoji: '‼️',
    description: 'Completed 4000 levels',

    unlocked: ({ user }) => {
      return user.score >= 4000;
    }

  },
  [AchievementType.COMPLETED_LEVELS_5000]: {
    name: 'Getting Legendary',
    emoji: '🐉',
    description: 'Completed 5000 levels',

    unlocked: ({ user }) => {
      return user.score >= 5000;
    }

  },
};
export const AchievementRulesTableCreator: {[achievementType: string]: IAchievementInfoCreator} = {
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
const difficultyList = getDifficultyList();

export const AchievementRulesTableLevelCompletion: {[achievementType: string]: IAchievementInfoLevelCompletion} = {
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

export enum AchievementCategory {
  'USER' = 'USER',
  'CREATOR' = 'CREATOR',
  'LEVEL_COMPLETION' = 'LEVEL_COMPLETION',
  'REVIEWER' = 'REVIEWER',
  'MULTIPLAYER' = 'MULTIPLAYER',
}
export const AchievementCategoryMapping = {
  [AchievementCategory.USER]: AchievementRulesTableUser,
  [AchievementCategory.CREATOR]: AchievementRulesTableCreator,
  [AchievementCategory.LEVEL_COMPLETION]: AchievementRulesTableLevelCompletion,
  [AchievementCategory.REVIEWER]: AchievementRulesTableReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesTableMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
