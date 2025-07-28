import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Game, Games } from '@root/constants/Games';
import { getAchievementCategoryDisplayName } from '@root/helpers/achievementCategoryDisplayNames';
import { getRarityFromStats } from '@root/helpers/achievementRarity';
import Achievement from '@root/models/db/achievement';
import { useEffect, useMemo, useState } from 'react';
import AchievementCategorySection from './achievementCategorySection';

interface AchievementsBrowserProps {
  userAchievements: Achievement[];
  userAchievementsByGame: Record<GameId, Achievement[]>;
  achievementStats: Array<{
    _id: { type: AchievementType; gameId: GameId };
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  game: Game;
  searchQuery: string;
  selectedCategory: string;
  selectedGame: GameId | 'all';
  filterUnlocked: 'all' | 'unlocked' | 'locked';
  filterRarity: 'all' | 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';
  totalAchievements: Record<string, number>;
  totalActiveUsers: number;
  showSearchFilters?: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setFilterUnlocked: (filter: 'all' | 'unlocked' | 'locked') => void;
  setFilterRarity: (filter: 'all' | 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common') => void;
  reqUser: { _id: string; name: string } | null;
}

export default function AchievementsBrowser({
  userAchievements,
  userAchievementsByGame,
  achievementStats,
  game,
  searchQuery,
  selectedCategory,
  selectedGame,
  filterUnlocked,
  filterRarity,
  totalAchievements,
  totalActiveUsers,
  showSearchFilters = true,
  setSearchQuery,
  setFilterUnlocked,
  setFilterRarity,
  reqUser,
}: AchievementsBrowserProps) {
  const viewMode = 'grid';
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Create a map for quick lookup of user achievements (by type and game)
  const userAchievementMap = useMemo(() => {
    const map = new Map<string, Achievement[]>();

    userAchievements.forEach(achievement => {
      const key = achievement.type;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(achievement);
    });

    return map;
  }, [userAchievements]);

  // Create a map for achievement statistics (by type and game)
  const statsMap = useMemo(() => {
    const map = new Map<string, { count: number; firstEarned: Date; lastEarned: Date; gameId: GameId }>();

    achievementStats.forEach(stat => {
      const key = `${stat._id.type}-${stat._id.gameId}`;

      map.set(key, {
        count: stat.count,
        firstEarned: stat.firstEarned,
        lastEarned: stat.lastEarned,
        gameId: stat._id.gameId
      });
    });

    return map;
  }, [achievementStats]);

  // Filter and search achievements
  const filteredCategories = useMemo(() => {
    const categories = selectedCategory === 'all'
      ? Object.keys(AchievementCategoryMapping)
      : [selectedCategory];

    const result: Record<string, Array<{ type: AchievementType; gameAchievements: Achievement[]; allGames: GameId[] }>> = {};

    categories.forEach(categoryKey => {
      // Skip categories that aren't supported by the selected game (unless viewing all games)
      if (selectedGame !== 'all') {
        const selectedGameObj = Object.values(Games).find(g => g.id === selectedGame);
        if (selectedGameObj && !selectedGameObj.achievementCategories.includes(categoryKey as AchievementCategory)) {
          return; // Skip this category
        }
      }
      const categoryAchievements = AchievementCategoryMapping[categoryKey as keyof typeof AchievementCategoryMapping];
      const achievements = Object.keys(categoryAchievements).map(achievementType => {
        const userAchievementsForType = userAchievementMap.get(achievementType) || [];

        // Get all games where this achievement exists (only games that support this category)
        const allGamesForType = (categoryKey === 'SOCIAL' || categoryKey === 'FEATURE_EXPLORER')
          ? [GameId.THINKY] // Social and Feature Explorer achievements are THINKY-only
          : Object.values(Games)
              .filter(game => game.achievementCategories.includes(categoryKey as AchievementCategory))
              .map(game => game.id);

        return {
          type: achievementType as AchievementType,
          gameAchievements: userAchievementsForType,
          allGames: allGamesForType,
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

      // Apply game filter
      const gameFiltered = searchFiltered.filter(({ allGames }) => {
        if (selectedGame === 'all') return true;

        // Show if this achievement exists in the selected game
        return allGames.includes(selectedGame);
      });

      // Apply unlock status filter
      const statusFiltered = gameFiltered.filter(({ gameAchievements }) => {
        if (filterUnlocked === 'all') return true;

        const isUnlockedInAnyGame = gameAchievements.length > 0;
        const isUnlockedInSelectedGame = selectedGame === 'all'
          ? isUnlockedInAnyGame
          : gameAchievements.some(ach => ach.gameId === selectedGame);

        if (filterUnlocked === 'unlocked') return selectedGame === 'all' ? isUnlockedInAnyGame : isUnlockedInSelectedGame;
        if (filterUnlocked === 'locked') return selectedGame === 'all' ? !isUnlockedInAnyGame : !isUnlockedInSelectedGame;

        return true;
      });

      // Apply rarity filter
      const rarityFiltered = statusFiltered.filter(({ type, allGames }) => {
        if (filterRarity === 'all') return true;

        // Get combined stats for this achievement
        let totalCount = 0;

        if (selectedGame === 'all') {
          allGames.forEach(gameId => {
            const key = `${type}-${gameId}`;
            const stat = statsMap.get(key);

            if (stat) totalCount += stat.count;
          });
        } else {
          const key = `${type}-${selectedGame}`;
          const stat = statsMap.get(key);

          totalCount = stat?.count || 0;
        }

        const achievementRarity = getRarityFromStats(totalCount, totalActiveUsers);

        return achievementRarity === filterRarity;
      });

      if (rarityFiltered.length > 0) {
        result[categoryKey] = rarityFiltered;
      }
    });

    return result;
  }, [selectedCategory, selectedGame, searchQuery, filterUnlocked, filterRarity, userAchievementMap, game, statsMap, totalActiveUsers]);

  // Count hidden achievements that are not yet unlocked
  const hiddenAchievementCount = useMemo(() => {
    const categories = selectedCategory === 'all'
      ? Object.keys(AchievementCategoryMapping)
      : [selectedCategory];

    let count = 0;

    categories.forEach(categoryKey => {
      const categoryAchievements = AchievementCategoryMapping[categoryKey as keyof typeof AchievementCategoryMapping];

      Object.keys(categoryAchievements).forEach(achievementType => {
        const achievementInfo = categoryAchievements[achievementType];
        const userAchievementsForType = userAchievementMap.get(achievementType) || [];

        // Get all games where this achievement exists (only games that support this category)
        const allGamesForType = (categoryKey === 'SOCIAL' || categoryKey === 'FEATURE_EXPLORER')
          ? [GameId.THINKY]
          : Object.values(Games)
              .filter(game => game.achievementCategories.includes(categoryKey as AchievementCategory))
              .map(game => game.id);

        // Apply game filter
        if (selectedGame !== 'all' && !allGamesForType.includes(selectedGame)) {
          return;
        }

        // Check if it's a hidden achievement that's not unlocked
        if (achievementInfo.secret) {
          const isUnlockedInAnyGame = userAchievementsForType.length > 0;
          const isUnlockedInSelectedGame = selectedGame === 'all'
            ? isUnlockedInAnyGame
            : userAchievementsForType.some(ach => ach.gameId === selectedGame);

          const isUnlocked = selectedGame === 'all' ? isUnlockedInAnyGame : isUnlockedInSelectedGame;

          if (!isUnlocked) {
            count++;
          }
        }
      });
    });

    return count;
  }, [selectedCategory, selectedGame, userAchievementMap]);

  // Count hidden achievements per category
  const hiddenAchievementsByCategory = useMemo(() => {
    const hiddenByCategory: Record<string, number> = {};

    Object.keys(AchievementCategoryMapping).forEach(categoryKey => {
      const categoryAchievements = AchievementCategoryMapping[categoryKey as keyof typeof AchievementCategoryMapping];
      let count = 0;

      Object.keys(categoryAchievements).forEach(achievementType => {
        const achievementInfo = categoryAchievements[achievementType];
        const userAchievementsForType = userAchievementMap.get(achievementType) || [];

        // Get all games where this achievement exists (only games that support this category)
        const allGamesForType = (categoryKey === 'SOCIAL' || categoryKey === 'FEATURE_EXPLORER')
          ? [GameId.THINKY]
          : Object.values(Games)
              .filter(game => game.achievementCategories.includes(categoryKey as AchievementCategory))
              .map(game => game.id);

        // Apply game filter
        if (selectedGame !== 'all' && !allGamesForType.includes(selectedGame)) {
          return;
        }

        // Check if it's a hidden achievement that's not unlocked
        if (achievementInfo.secret) {
          const isUnlockedInAnyGame = userAchievementsForType.length > 0;
          const isUnlockedInSelectedGame = selectedGame === 'all'
            ? isUnlockedInAnyGame
            : userAchievementsForType.some(ach => ach.gameId === selectedGame);

          const isUnlocked = selectedGame === 'all' ? isUnlockedInAnyGame : isUnlockedInSelectedGame;

          if (!isUnlocked) {
            count++;
          }
        }
      });

      hiddenByCategory[categoryKey] = count;
    });

    return hiddenByCategory;
  }, [selectedGame, userAchievementMap]);

  const isEmpty = Object.keys(filteredCategories).length === 0;

  // Calculate category stats for navigation tiles
  const categoryStats = useMemo(() => {
    const stats: Array<{
      key: string;
      name: string;
      totalCount: number;
      unlockedCount: number;
      percentage: number;
      icon: string;
    }> = [];

    // Add individual categories that have visible achievements
    const categoryKeyToNameAndIcon: Record<string, { name: string; icon: string }> = {
      [AchievementCategory.SOCIAL]: { name: getAchievementCategoryDisplayName(AchievementCategory.SOCIAL), icon: '👥' },
      [AchievementCategory.FEATURE_EXPLORER]: { name: getAchievementCategoryDisplayName(AchievementCategory.FEATURE_EXPLORER), icon: '🧭' },
      [AchievementCategory.PROGRESS]: { name: getAchievementCategoryDisplayName(AchievementCategory.PROGRESS), icon: '📈' },
      [AchievementCategory.CREATOR]: { name: getAchievementCategoryDisplayName(AchievementCategory.CREATOR), icon: '🛠️' },
      [AchievementCategory.SKILL]: { name: getAchievementCategoryDisplayName(AchievementCategory.SKILL), icon: '🎯' },
      [AchievementCategory.REVIEWER]: { name: getAchievementCategoryDisplayName(AchievementCategory.REVIEWER), icon: '⭐' },
      [AchievementCategory.MULTIPLAYER]: { name: getAchievementCategoryDisplayName(AchievementCategory.MULTIPLAYER), icon: '🎮' },
      [AchievementCategory.CHAPTER_COMPLETION]: { name: getAchievementCategoryDisplayName(AchievementCategory.CHAPTER_COMPLETION), icon: ' 🏁' },
    };

    Object.entries(filteredCategories).forEach(([categoryKey, achievements]) => {
      const { name: categoryName, icon } = categoryKeyToNameAndIcon[categoryKey] || { name: categoryKey, icon: '🏅' };

      // Calculate unlocked achievements for this category
      const unlockedCount = achievements.filter(a => {
        if (selectedGame === 'all') {
          return a.gameAchievements.length > 0;
        }

        return a.gameAchievements.some(ach => ach.gameId === selectedGame);
      }).length;

      const totalCount = totalAchievements[categoryKey] || 0;
      const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

      stats.push({
        key: categoryKey,
        name: categoryName,
        totalCount,
        unlockedCount,
        percentage,
        icon
      });
    });

    // Add hidden achievements if any
    if (hiddenAchievementCount > 0) {
      stats.push({
        key: 'hidden',
        name: 'Hidden',
        totalCount: hiddenAchievementCount,
        unlockedCount: 0, // Hidden achievements are by definition not unlocked
        percentage: 0,
        icon: '🔒'
      });
    }

    return stats;
  }, [filteredCategories, hiddenAchievementCount, totalAchievements, selectedGame]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (element) {
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const offset = 80; // Add some padding from the top

      window.scrollTo({
        top: absoluteElementTop - offset,
        behavior: 'smooth'
      });
    }
  };

  const scrollToNavigationTiles = () => {
    const element = document.getElementById('navigation-tiles');

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Show button only when navigation tiles are completely out of view
      const navigationElement = document.getElementById('navigation-tiles');

      if (navigationElement) {
        const rect = navigationElement.getBoundingClientRect();

        // Hide button when any part of the navigation tiles is visible
        setShowScrollButton(rect.bottom < 0);
      } else {
        // Fallback if element not found
        setShowScrollButton(window.scrollY > 600);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='space-y-6 relative'>
      {/* Category Navigation Tiles */}
      <div id='navigation-tiles' className='bg-2 rounded-xl p-4 border border-color-3'>
        <div className='mb-3'>
          <h3 className='text-lg font-semibold'>Categories</h3>
          <p className='text-sm opacity-75'>Click to jump to a category section</p>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'>
          {categoryStats.map((category) => (
            <button
              key={category.key}
              onClick={() => scrollToSection(`category-${category.key}`)}
              className='p-3 rounded-lg border transition-all border-color-4 bg-3 hover:bg-4 hover:border-blue-400'
            >
              <div className='flex flex-col items-center gap-2'>
                <div className='text-2xl'>{category.icon}</div>
                <div className='text-center'>
                  <div className='font-semibold text-sm'>{category.name}</div>
                  <div className='text-xs opacity-75'>
                    {category.key === 'hidden'
                      ? `${category.totalCount} remaining`
                      : `${category.unlockedCount}/${category.totalCount}`
                    }
                  </div>
                  {category.key !== 'hidden' && (
                    <>
                      <div className='text-lg font-bold text-blue-500 mt-1'>
                        {category.percentage}%
                      </div>
                      <div className='w-full h-2 bg-color-base rounded-full overflow-hidden mt-1'>
                        <div
                          className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Scroll to Top Button */}
      {showScrollButton && (
        <button
          onClick={scrollToNavigationTiles}
          className='fixed bottom-6 right-6 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all z-50 flex items-center justify-center'
          title='Scroll to navigation'
        >
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 10l7-7m0 0l7 7m-7-7v18' />
          </svg>
        </button>
      )}
      {showSearchFilters && (
        <div className='bg-2 rounded-xl p-3 border border-color-3'>
          <div className='flex flex-col lg:flex-row gap-3 items-center'>
            {/* Search Input */}
            <div className='flex-1 w-full lg:w-auto'>
              <input
                type='text'
                placeholder='Search achievements...'
                className='w-full px-3 py-2 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className='flex flex-row gap-3 items-center'>
              {/* Status Filter */}
              {reqUser && (
                <select
                  className='px-3 py-2 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors min-w-[150px]'
                  value={filterUnlocked}
                  onChange={(e) => setFilterUnlocked(e.target.value as 'all' | 'unlocked' | 'locked')}
                >
                  <option value='all'>All Achievements</option>
                  <option value='unlocked'>Unlocked</option>
                  <option value='locked'>Locked</option>
                </select>
              )}
              {/* Rarity Filter */}
              <select
                className='px-3 py-2 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors min-w-[150px]'
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as 'all' | 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common')}
              >
                <option value='all'>All Rarities</option>
                <option value='legendary'>🟣 Legendary</option>
                <option value='epic'>🟠 Epic</option>
                <option value='rare'>🔵 Rare</option>
                <option value='uncommon'>🟢 Uncommon</option>
                <option value='common'>⚪ Common</option>
              </select>
            </div>
          </div>
        </div>
      )}
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
            const categoryName = getAchievementCategoryDisplayName(categoryKey as AchievementCategory);

            const unlockedCount = achievements.filter(a => {
              if (selectedGame === 'all') {
                return a.gameAchievements.length > 0;
              }

              return a.gameAchievements.some(ach => ach.gameId === selectedGame);
            }).length;
            const totalCount = totalAchievements[categoryKey] || achievements.length;

            return (
              <AchievementCategorySection
                key={categoryKey}
                categoryName={categoryName}
                achievements={achievements}
                unlockedCount={unlockedCount}
                totalCount={totalCount}
                hiddenCount={hiddenAchievementsByCategory[categoryKey] || 0}
                viewMode={viewMode}
                game={game}
                statsMap={statsMap}
                selectedGame={selectedGame}
                userAchievementsByGame={userAchievementsByGame}
                totalActiveUsers={totalActiveUsers}
                sectionId={`category-${categoryKey}`}
              />
            );
          })}
          {/* Hidden Achievements Section */}
          {hiddenAchievementCount > 0 && (
            <div id='category-hidden' className='bg-2 rounded-xl border border-color-3 overflow-hidden'>
              <div className='px-6 py-4 bg-3'>
                <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2'>
                    <h2 className='text-xl font-bold'>🔒 Hidden Achievements</h2>
                  </div>
                  <div className='text-sm opacity-75'>
                    {hiddenAchievementCount} remaining
                  </div>
                </div>
              </div>
              <div className='p-6'>
                <div className='text-center py-8'>
                  <div className='text-6xl mb-4'>🕵️</div>
                  <h3 className='text-xl font-semibold mb-2'>Mystery Awaits</h3>
                  <p className='opacity-75 mb-4'>
                    There {hiddenAchievementCount === 1 ? 'is' : 'are'} {hiddenAchievementCount} secret achievement{hiddenAchievementCount === 1 ? '' : 's'} waiting to be discovered.
                  </p>
                  <p className='text-sm opacity-60'>
                    Keep playing to unlock the mysteries!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
