import AchievementCategory from '@root/constants/achievements/achievementCategory';

/**
 * Maps achievement category internal names to user-friendly display names
 */
export const achievementCategoryDisplayNames: Record<AchievementCategory, string> = {
  [AchievementCategory.SOCIAL]: 'Social',
  [AchievementCategory.PROGRESS]: 'Progress',
  [AchievementCategory.CREATOR]: 'Creator',
  [AchievementCategory.SKILL]: 'Skill',
  [AchievementCategory.REVIEWER]: 'Reviewer',
  [AchievementCategory.MULTIPLAYER]: 'Multiplayer',
  [AchievementCategory.CHAPTER_COMPLETION]: 'Campaign Completion',
};

/**
 * Gets the display name for an achievement category
 * @param categoryKey The internal category key
 * @returns The user-friendly display name
 */
export function getAchievementCategoryDisplayName(categoryKey: AchievementCategory): string {
  return achievementCategoryDisplayNames[categoryKey] ||
    categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).toLowerCase();
}
