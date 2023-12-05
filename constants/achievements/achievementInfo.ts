import AchievementRulesCreator from './AchievementRulesCreator';
import AchievementRulesMultiplayer from './AchievementRulesMultiplayer';
import AchievementRulesProgress from './AchievementRulesProgress';
import AchievementRulesReviewer from './AchievementRulesReviewer';
import AchievementRulesSkill from './AchievementRulesSkill';

export interface IAchievementInfo {
  description: string;
  discordNotification?: boolean;
  emoji?: string;
  name: string;
  secret?: boolean;
  tooltip?: string;
}

export enum AchievementCategory {
  USER = 'USER',
  CREATOR = 'CREATOR',
  SKILL = 'LEVEL_COMPLETION',
  REVIEWER = 'REVIEWER',
  MULTIPLAYER = 'MULTIPLAYER',
}

export const AchievementCategoryMapping = {
  [AchievementCategory.USER]: AchievementRulesProgress,
  [AchievementCategory.CREATOR]: AchievementRulesCreator,
  [AchievementCategory.SKILL]: AchievementRulesSkill,
  [AchievementCategory.REVIEWER]: AchievementRulesReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
