import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Game } from '@root/constants/Games';
import { getAchievementCategoryDisplayName } from '@root/helpers/achievementCategoryDisplayNames';
import Achievement from '@root/models/db/achievement';
import { useMemo } from 'react';
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
  totalAchievements: Record<string, number>;
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
  totalAchievements,
}: AchievementsBrowserProps) {
  const viewMode = 'grid';

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
      const categoryAchievements = AchievementCategoryMapping[categoryKey as keyof typeof AchievementCategoryMapping];
      const achievements = Object.keys(categoryAchievements).map(achievementType => {
        const userAchievementsForType = userAchievementMap.get(achievementType) || [];

        // Get all games where this achievement exists (based on user achievements or all games for the category)
        const allGamesForType = categoryKey === 'SOCIAL'
          ? [GameId.THINKY] // Social achievements are THINKY-only
          : Object.values(GameId).filter(gameId => gameId !== GameId.THINKY); // Other achievements exist in game-specific instances

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

      if (statusFiltered.length > 0) {
        result[categoryKey] = statusFiltered;
      }
    });

    return result;
  }, [selectedCategory, selectedGame, searchQuery, filterUnlocked, userAchievementMap, game]);

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

        // Get all games where this achievement exists
        const allGamesForType = categoryKey === 'SOCIAL'
          ? [GameId.THINKY]
          : Object.values(GameId).filter(gameId => gameId !== GameId.THINKY);

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

  const isEmpty = Object.keys(filteredCategories).length === 0;

  return (
    <div className='space-y-6'>
      {/* Achievement Count */}
      <div className='text-sm opacity-75'>
        {Object.values(filteredCategories).reduce((sum, achievements) => sum + achievements.length, 0)} achievements found
        {hiddenAchievementCount > 0 && (
          <span className='ml-2'>• {hiddenAchievementCount} hidden achievements remaining</span>
        )}
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
                viewMode={viewMode}
                game={game}
                statsMap={statsMap}
                selectedGame={selectedGame}
                userAchievementsByGame={userAchievementsByGame}
              />
            );
          })}
          
          {/* Hidden Achievements Section */}
          {hiddenAchievementCount > 0 && (
            <div className='bg-2 rounded-xl border border-color-3 overflow-hidden'>
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
