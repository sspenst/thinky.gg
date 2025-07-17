export type RarityType = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common' | 'never';

/**
 * Determines rarity tier based on achievement count/stats
 * @param count Number of players who have earned the achievement
 * @param totalUsers Optional total number of users for percentage calculation
 * @returns Rarity tier string
 */
export function getRarityFromStats(count: number, totalUsers?: number): RarityType {
  // If we have total users, calculate actual percentage
  if (totalUsers && totalUsers > 0) {
    const percentage = (count / totalUsers) * 100;

    if (percentage === 0) return 'never';
    if (percentage < 1) return 'legendary';
    if (percentage < 5) return 'epic';
    if (percentage < 15) return 'rare';
    if (percentage < 40) return 'uncommon';

    return 'common';
  }

  // Fallback: Use achievement count thresholds (more realistic than hardcoded 1000)

  if (count === 0) return 'never';
  if (count < 5) return 'legendary'; // Less than 5 people
  if (count < 25) return 'epic'; // Less than 25 people
  if (count < 100) return 'rare'; // Less than 100 people
  if (count < 250) return 'uncommon'; // Less than 250 people

  return 'common'; // 250+ people
}

/**
 * Gets the display text for a rarity tier
 * @param rarity Rarity tier
 * @returns Human-readable rarity name
 */
export function getRarityText(rarity: RarityType): string {
  switch (rarity) {
  case 'never': return 'Never Earned';
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
  case 'never': return 'text-gray-500';
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
 * @param count Optional count for more specific tooltip
 * @param totalUsers Optional total users for percentage-based tooltip
 * @returns Tooltip description
 */
export function getRarityTooltip(rarity: RarityType, count?: number, totalUsers?: number): string {
  // If we have both count and total users, show percentage
  if (count !== undefined && totalUsers && totalUsers > 0) {
    if (count === 0) return 'No one has earned this achievement yet';

    // Always show 1 significant digit for the percentage
    const percentageNum = (count / totalUsers) * 100;
    let percentageStr: string;

    if (percentageNum === 0) {
      percentageStr = '0';
    } else if (percentageNum < 1) {
      // For very small percentages, show one significant digit (e.g., 0.3, 0.04)
      const exp = Math.floor(Math.log10(percentageNum));
      const factor = Math.pow(10, exp - 0);

      percentageStr = (Math.round(percentageNum / factor) * factor).toPrecision(1);
    } else {
      // For 1 or more, show one significant digit (e.g., 3, 7, 40, 90)
      percentageStr = percentageNum.toPrecision(1).replace(/\.0+$/, '');
    }

    return `${percentageStr}% of players`;
  }

  // If we only have count, show count-based description
  if (count !== undefined) {
    switch (rarity) {
    case 'legendary': return `Only ${count} players - extremely rare!`;
    case 'epic': return `${count} players - very rare!`;
    case 'rare': return `${count} players - uncommon`;
    case 'uncommon': return `${count} players - moderately rare`;
    case 'common': return `${count} players - widely earned`;
    case 'never': return 'No one has earned this achievement yet';
    }
  }

  // Fallback to generic descriptions
  switch (rarity) {
  case 'never': return 'Never earned';
  case 'legendary': return 'Extremely rare achievement';
  case 'epic': return 'Very rare achievement';
  case 'rare': return 'Uncommon achievement';
  case 'uncommon': return 'Moderately rare achievement';
  case 'common': return 'Commonly earned achievement';
  }
}
