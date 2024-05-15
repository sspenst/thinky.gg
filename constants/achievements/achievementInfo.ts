import { Game } from '../Games';
import AchievementRulesCreator from './AchievementRulesCreator';
import AchievementRulesMultiplayer from './AchievementRulesMultiplayer';
import AchievementRulesProgress from './AchievementRulesProgress';
import AchievementRulesReviewer from './AchievementRulesReviewer';
import AchievementRulesSkill from './AchievementRulesSkill';
import AchievementRulesSocial from './AchievementRulesSocial';

export interface IAchievementInfo {
  discordNotification?: boolean;
  emoji?: string;
  getDescription: (game: Game) => string;
  name: string;
  secret?: boolean;
  tooltip?: string;
}

export enum AchievementCategory {
  SOCIAL = 'SOCIAL',
  PROGRESS = 'USER',
  CREATOR = 'CREATOR',
  SKILL = 'LEVEL_COMPLETION',
  REVIEWER = 'REVIEWER',
  MULTIPLAYER = 'MULTIPLAYER',
}

export const AchievementCategoryMapping = {
  [AchievementCategory.SOCIAL]: AchievementRulesSocial,
  [AchievementCategory.PROGRESS]: AchievementRulesProgress,
  [AchievementCategory.CREATOR]: AchievementRulesCreator,
  [AchievementCategory.SKILL]: AchievementRulesSkill,
  [AchievementCategory.REVIEWER]: AchievementRulesReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
