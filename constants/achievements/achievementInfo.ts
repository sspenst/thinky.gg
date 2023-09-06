import { AchievementRulesTableCreator } from './AchievementRulesTableCreator';
import { AchievementRulesTableLevelCompletion } from './AchievementRulesTableLevelCompletion';
import { AchievementRulesTableMultiplayer } from './AchievementRulesTableMultiplayer';
import { AchievementRulesTableReviewer } from './AchievementRulesTableReviewer';
import { AchievementRulesTableUser } from './AchievementRulesTableUser';

export interface IAchievementInfo {
  name: string;
  emoji?: string;
  description: string;

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
  [AchievementCategory.LEVEL_COMPLETION]: AchievementRulesTableLevelCompletion,
  [AchievementCategory.REVIEWER]: AchievementRulesTableReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesTableMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
