export type RarityType = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * Determines rarity tier based on achievement count/stats
 * @param count Number of players who have earned the achievement
 * @returns Rarity tier string
 */
export function getRarityFromStats(count: number): RarityType {
  const percentage = (count / 1000) * 100;
  if (percentage < 1) return 'legendary';
  if (percentage < 5) return 'epic';
  if (percentage < 15) return 'rare';
  if (percentage < 40) return 'uncommon';
  return 'common';
}

/**
 * Gets the display text for a rarity tier
 * @param rarity Rarity tier
 * @returns Human-readable rarity name
 */
export function getRarityText(rarity: RarityType): string {
  switch (rarity) {
    case 'legendary': return 'Legendary';
    case 'epic': return 'Epic';
    case 'rare': return 'Rare';
    case 'uncommon': return 'Uncommon';
    case 'common': return 'Common';
  }
}

/**
 * Gets the CSS color class for a rarity tier
 * @param rarity Rarity tier
 * @returns Tailwind CSS color class
 */
export function getRarityColor(rarity: RarityType): string {
  switch (rarity) {
    case 'legendary': return 'text-purple-500';
    case 'epic': return 'text-orange-500';
    case 'rare': return 'text-blue-500';
    case 'uncommon': return 'text-green-500';
    case 'common': return 'text-gray-500';
  }
}

/**
 * Gets the tooltip text for a rarity tier
 * @param rarity Rarity tier
 * @returns Tooltip description
 */
export function getRarityTooltip(rarity: RarityType): string {
  switch (rarity) {
    case 'legendary': return 'Less than 1% of players';
    case 'epic': return 'Less than 5% of players';
    case 'rare': return 'Less than 15% of players';
    case 'uncommon': return 'Less than 40% of players';
    case 'common': return '40% or more of players';
  }
}