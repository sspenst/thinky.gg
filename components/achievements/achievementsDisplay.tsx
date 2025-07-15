import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import Achievement from '@root/models/db/achievement';
import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import AchievementsBrowser from './achievementsBrowser';

interface AchievementsDisplayProps {
  userAchievements: Achievement[];
  userAchievementsByGame: Record<GameId, Achievement[]>;
  achievementStats: Array<{
    _id: { type: AchievementType; gameId: GameId };
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  totalAchievements: Record<string, number>;
  reqUser: { _id: string; name: string } | null;
  showProgressSection?: boolean;
  showSearchFilters?: boolean;
  showGameTiles?: boolean;
  defaultSelectedGame?: GameId | 'all';
}

export default function AchievementsDisplay({
  userAchievements,
  userAchievementsByGame,
  achievementStats,
  totalAchievements,
  reqUser,
  showProgressSection = true,
  showSearchFilters = true,
  showGameTiles = true,
  defaultSelectedGame = 'all',
}: AchievementsDisplayProps) {
  const { game } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<GameId | 'all'>(defaultSelectedGame);
  const [filterUnlocked, setFilterUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Reset category when it becomes invalid for the selected game
  useEffect(() => {
    if (selectedCategory !== 'all') {
      const availableCategories = Object.keys(totalAchievements).filter(category => {
        if (selectedGame === 'all') {
          return true;
        }

        if (selectedGame === GameId.THINKY) {
          return category === 'SOCIAL';
        }

        return category !== 'SOCIAL';
      });

      if (!availableCategories.includes(selectedCategory)) {
        setSelectedCategory('all');
      }
    }
  }, [selectedGame, selectedCategory, totalAchievements]);

  // Calculate total progress across all games
  const totalUnlockedCount = userAchievements.length;
  const socialAchievementCount = totalAchievements['SOCIAL'] || 0;
  const gameAchievementCount = Object.entries(totalAchievements)
    .filter(([category]) => category !== 'SOCIAL')
    .reduce((sum, [, count]) => sum + count, 0);
  const gameCount = Object.values(GameId).filter(gameId => gameId !== GameId.THINKY).length;
  const totalAvailableCount = socialAchievementCount + (gameAchievementCount * gameCount);

  // Calculate progress per game
  const gameProgressData = Object.values(GameId).map(gameId => {
    const gameAchievements = userAchievementsByGame[gameId] || [];
    const gameInfo = Games[gameId];

    // Calculate total achievements for this specific game
    const totalForGame = gameId === GameId.THINKY
      ? totalAchievements['SOCIAL'] || 0 // Only social achievements for THINKY
      : Object.entries(totalAchievements)
        .filter(([category]) => category !== 'SOCIAL') // All categories except social for games
        .reduce((sum, [, count]) => sum + count, 0);

    return {
      gameId,
      name: gameInfo.displayName,
      logo: gameInfo.logoPng,
      unlocked: gameAchievements.length,
      total: totalForGame,
      percentage: totalForGame > 0 ? Math.round((gameAchievements.length / totalForGame) * 100) : 0
    };
  });

  return (
    <div className='flex flex-col gap-6 p-3 max-w-7xl mx-auto'>
      {showProgressSection && reqUser && (
        <>
          {/* Header Section */}
          <div className='text-center space-y-4'>
            <h1 className='text-4xl font-bold'>🏆 Achievements</h1>
            <p className='text-lg opacity-75'>
              Track your progress and unlock achievements as you play!
            </p>
            <div className='bg-2 rounded-xl p-4 border border-color-3'>
              {/* Overall Progress */}
              <div className='text-center mb-2'>
                <h2 className='text-2xl font-bold'>{reqUser.name}&apos;s Progress</h2>
                <p className='text-lg'>
                  {totalUnlockedCount} of {totalAvailableCount} achievements unlocked
                </p>
                <div className='flex justify-center mt-2'>
                  <div className='flex flex-row items-center gap-2'>
                    <div className='w-32 h-3 bg-3 rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500'
                        style={{ width: `${totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%` }}
                      />
                    </div>
                    <div className='text-3xl font-bold text-blue-500'>
                      {totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
              {/* Game Progress Grid */}
              <div>
                <h3 className='text-lg font-semibold mb-3'>Progress by Game</h3>
                <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
                  {gameProgressData.map((gameData) => (
                    <button
                      key={gameData.gameId}
                      onClick={() => setSelectedGame(gameData.gameId)}
                      className={`p-4 rounded-lg border transition-all hover:border-blue-500 ${
                        selectedGame === gameData.gameId
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-color-4 bg-3 hover:bg-4'
                      }`}
                    >
                      <div className='flex flex-col items-center gap-3'>
                        <Image
                          src={gameData.logo}
                          alt={gameData.name}
                          width={40}
                          height={40}
                          className='rounded'
                        />
                        <div className='text-center'>
                          <div className='font-semibold text-sm'>{gameData.name}</div>
                          <div className='text-xs opacity-75'>
                            {gameData.unlocked}/{gameData.total}
                          </div>
                        </div>
                        <div className='w-full'>
                          <div className='text-lg font-bold text-blue-500 text-center mb-1'>
                            {gameData.percentage}%
                          </div>
                          <div className='w-full h-2 bg-color-base rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                              style={{ width: `${gameData.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {/* All Games Tile */}
                  <button
                    onClick={() => setSelectedGame('all')}
                    className={`p-4 rounded-lg border transition-all hover:border-blue-500 ${
                      selectedGame === 'all'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-color-4 bg-3 hover:bg-4'
                    }`}
                  >
                    <div className='flex flex-col items-center gap-3'>
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center'>
                        <span className='text-white font-bold text-sm'>All</span>
                      </div>
                      <div className='text-center'>
                        <div className='font-semibold text-sm'>All Games</div>
                        <div className='text-xs opacity-75'>
                          {totalUnlockedCount}/{totalAvailableCount}
                        </div>
                      </div>
                      <div className='w-full'>
                        <div className='text-lg font-bold text-blue-500 text-center mb-1'>
                          {totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%
                        </div>
                        <div className='w-full h-2 bg-color-base rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                            style={{ width: `${totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {showGameTiles && !showProgressSection && (
        <div className='bg-2 rounded-xl p-4 border border-color-3'>
          <h3 className='text-lg font-semibold mb-3'>Filter by Game</h3>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {gameProgressData.map((gameData) => (
              <button
                key={gameData.gameId}
                onClick={() => setSelectedGame(gameData.gameId)}
                className={`p-4 rounded-lg border transition-all hover:border-blue-500 ${
                  selectedGame === gameData.gameId
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-color-4 bg-3 hover:bg-4'
                }`}
              >
                <div className='flex flex-col items-center gap-3'>
                  <Image
                    src={gameData.logo}
                    alt={gameData.name}
                    width={40}
                    height={40}
                    className='rounded'
                  />
                  <div className='text-center'>
                    <div className='font-semibold text-sm'>{gameData.name}</div>
                    <div className='text-xs opacity-75'>
                      {gameData.unlocked}/{gameData.total}
                    </div>
                  </div>
                  <div className='w-full'>
                    <div className='text-lg font-bold text-blue-500 text-center mb-1'>
                      {gameData.percentage}%
                    </div>
                    <div className='w-full h-2 bg-color-base rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                        style={{ width: `${gameData.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {/* All Games Tile */}
            <button
              onClick={() => setSelectedGame('all')}
              className={`p-4 rounded-lg border transition-all hover:border-blue-500 ${
                selectedGame === 'all'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-color-4 bg-3 hover:bg-4'
              }`}
            >
              <div className='flex flex-col items-center gap-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center'>
                  <span className='text-white font-bold text-sm'>All</span>
                </div>
                <div className='text-center'>
                  <div className='font-semibold text-sm'>All Games</div>
                  <div className='text-xs opacity-75'>
                    {totalUnlockedCount}/{totalAvailableCount}
                  </div>
                </div>
                <div className='w-full'>
                  <div className='text-lg font-bold text-blue-500 text-center mb-1'>
                    {totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%
                  </div>
                  <div className='w-full h-2 bg-color-base rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500'
                      style={{ width: `${totalAvailableCount > 0 ? Math.round((totalUnlockedCount / totalAvailableCount) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
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
              {/* Category Filter */}
              <select
                className='px-3 py-2 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors min-w-[150px]'
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value='all'>All Categories</option>
                {Object.keys(totalAchievements).filter(category => {
                // Filter categories based on selected game
                  if (selectedGame === 'all') {
                    return true; // Show all categories when viewing all games
                  }

                  if (selectedGame === GameId.THINKY) {
                    return category === 'SOCIAL'; // Only social achievements for THINKY
                  }

                  return category !== 'SOCIAL'; // All categories except social for other games
                }).map(category => (
                  <option key={category} value={category}>
                    {category === 'SOCIAL' ? 'Social' :
                      category === 'USER' ? 'Progress' :
                        category === 'CREATOR' ? 'Creator' :
                          category === 'LEVEL_COMPLETION' ? 'Skill' :
                            category === 'REVIEWER' ? 'Reviewer' :
                              category === 'MULTIPLAYER' ? 'Multiplayer' : category}
                  </option>
                ))}
              </select>
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
            </div>
          </div>
        </div>
      )}
      {/* Achievements Browser */}
      <AchievementsBrowser
        userAchievements={userAchievements}
        userAchievementsByGame={userAchievementsByGame}
        achievementStats={achievementStats}
        game={game}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedGame={selectedGame}
        filterUnlocked={filterUnlocked}
        totalAchievements={totalAchievements}
      />
    </div>
  );
}
