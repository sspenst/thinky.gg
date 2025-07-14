import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { Game } from '@root/constants/Games';
import { getAchievementCategoryDisplayName } from '@root/helpers/achievementCategoryDisplayNames';
import Achievement from '@root/models/db/achievement';
import { useMemo, useState } from 'react';
import AchievementCategorySection from './achievementCategorySection';

interface AchievementsBrowserProps {
  userAchievements: Achievement[];
  achievementStats: Array<{
    _id: AchievementType;
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  game: Game;
  searchQuery: string;
  selectedCategory: string;
  filterUnlocked: 'all' | 'unlocked' | 'locked';
  totalAchievements: Record<string, number>;
}

export default function AchievementsBrowser({
  userAchievements,
  achievementStats,
  game,
  searchQuery,
  selectedCategory,
  filterUnlocked,
  totalAchievements,
}: AchievementsBrowserProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Create a map for quick lookup of user achievements
  const userAchievementMap = useMemo(() => {
    const map = new Map<string, Achievement>();

    userAchievements.forEach(achievement => {
      map.set(achievement.type, achievement);
    });

    return map;
  }, [userAchievements]);

  // Create a map for achievement statistics
  const statsMap = useMemo(() => {
    const map = new Map<string, { count: number; firstEarned: Date; lastEarned: Date }>();

    achievementStats.forEach(stat => {
      map.set(stat._id, {
        count: stat.count,
        firstEarned: stat.firstEarned,
        lastEarned: stat.lastEarned
      });
    });

    return map;
  }, [achievementStats]);

  // Filter and search achievements
  const filteredCategories = useMemo(() => {
    const categories = selectedCategory === 'all'
      ? Object.keys(AchievementCategoryMapping)
      : [selectedCategory];

    const result: Record<string, Array<{ type: AchievementType; isUnlocked: boolean; achievement?: Achievement }>> = {};

    categories.forEach(categoryKey => {
      const categoryAchievements = AchievementCategoryMapping[categoryKey];
      const achievements = Object.keys(categoryAchievements).map(achievementType => {
        const userAchievement = userAchievementMap.get(achievementType);
        const isUnlocked = !!userAchievement;

        return {
          type: achievementType as AchievementType,
          isUnlocked,
          achievement: userAchievement,
        };
      });

      // Apply search filter
      const searchFiltered = achievements.filter(({ type }) => {
        const achievementInfo = categoryAchievements[type];
        const searchLower = searchQuery.toLowerCase();

        return (
          achievementInfo.name.toLowerCase().includes(searchLower) ||
          achievementInfo.getDescription(game).toLowerCase().includes(searchLower)
        );
      });

      // Apply unlock status filter
      const statusFiltered = searchFiltered.filter(({ isUnlocked }) => {
        if (filterUnlocked === 'unlocked') return isUnlocked;
        if (filterUnlocked === 'locked') return !isUnlocked;

        return true;
      });

      if (statusFiltered.length > 0) {
        result[categoryKey] = statusFiltered;
      }
    });

    return result;
  }, [selectedCategory, searchQuery, filterUnlocked, userAchievementMap, game]);

  const isEmpty = Object.keys(filteredCategories).length === 0;

  return (
    <div className='space-y-6'>
      {/* View Mode Toggle */}
      <div className='flex justify-between items-center'>
        <div className='text-sm opacity-75'>
          {Object.values(filteredCategories).reduce((sum, achievements) => sum + achievements.length, 0)} achievements found
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-500 text-white'
                : 'bg-3 hover:bg-4'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-3 hover:bg-4'
            }`}
          >
            List
          </button>
        </div>
      </div>
      {/* Achievement Categories */}
      {isEmpty ? (
        <div className='text-center py-12'>
          <div className='text-6xl mb-4'>🔍</div>
          <h3 className='text-xl font-semibold mb-2'>No achievements found</h3>
          <p className='opacity-75'>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className='space-y-8'>
          {Object.entries(filteredCategories).map(([categoryKey, achievements]) => {
            const categoryName = getAchievementCategoryDisplayName(categoryKey);
            const unlockedCount = achievements.filter(a => a.isUnlocked).length;
            const totalCount = totalAchievements[categoryKey] || achievements.length;

            return (
              <AchievementCategorySection
                key={categoryKey}
                categoryName={categoryName}
                achievements={achievements}
                unlockedCount={unlockedCount}
                totalCount={totalCount}
                viewMode={viewMode}
                game={game}
                statsMap={statsMap}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
