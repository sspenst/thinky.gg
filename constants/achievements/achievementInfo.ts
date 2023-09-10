import AchievementRulesSkill from './AchievementRulesSkill';
import { AchievementRulesTableCreator } from './AchievementRulesTableCreator';
import { AchievementRulesTableMultiplayer } from './AchievementRulesTableMultiplayer';
import { AchievementRulesTableReviewer } from './AchievementRulesTableReviewer';
import { AchievementRulesTableUser } from './AchievementRulesTableUser';

export interface IAchievementInfo {
  description: string;
  emoji?: string;
  name: string;
  tooltip?: string;
}

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
  [AchievementCategory.LEVEL_COMPLETION]: AchievementRulesSkill,
  [AchievementCategory.REVIEWER]: AchievementRulesTableReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesTableMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
