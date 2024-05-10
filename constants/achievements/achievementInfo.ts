import { Game } from '../Games';
import AchievementRulesCreator from './AchievementRulesCreator';
import AchievementRulesMultiplayer from './AchievementRulesMultiplayer';
import AchievementRulesProgress from './AchievementRulesProgress';
import AchievementRulesReviewer from './AchievementRulesReviewer';
import AchievementRulesSkill from './AchievementRulesSkill';
import AchievementRulesThinky from './AchievementRulesSocial';

export interface IAchievementInfo {
  discordNotification?: boolean;
  emoji?: string;
  getDescription: (game: Game) => string;
  name: string;
  secret?: boolean;
  tooltip?: string;
}

export enum AchievementCategory {
  PROGRESS = 'USER',
  CREATOR = 'CREATOR',
  SKILL = 'LEVEL_COMPLETION',
  THINKY = 'THINKY',
  REVIEWER = 'REVIEWER',
  MULTIPLAYER = 'MULTIPLAYER',
}

export const AchievementCategoryMapping = {
  [AchievementCategory.PROGRESS]: AchievementRulesProgress,
  [AchievementCategory.CREATOR]: AchievementRulesCreator,
  [AchievementCategory.SKILL]: AchievementRulesSkill,
  [AchievementCategory.THINKY]: AchievementRulesThinky,
  [AchievementCategory.REVIEWER]: AchievementRulesReviewer,
  [AchievementCategory.MULTIPLAYER]: AchievementRulesMultiplayer,
};

// dynamically calculate
export const AchievementRulesCombined = Object.assign({}, ...Object.values(AchievementCategoryMapping)) as {[achievementType: string]: IAchievementInfo};
