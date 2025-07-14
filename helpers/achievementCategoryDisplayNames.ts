/**
 * Maps achievement category internal names to user-friendly display names
 */
export const achievementCategoryDisplayNames: Record<string, string> = {
  'SOCIAL': 'Social',
  'USER': 'Progress',
  'CREATOR': 'Creator',
  'LEVEL_COMPLETION': 'Skill',
  'REVIEWER': 'Reviewer',
  'MULTIPLAYER': 'Multiplayer'
};

/**
 * Gets the display name for an achievement category
 * @param categoryKey The internal category key
 * @returns The user-friendly display name
 */
export function getAchievementCategoryDisplayName(categoryKey: string): string {
  return achievementCategoryDisplayNames[categoryKey] ||
    categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).toLowerCase();
}
