import FormattedAchievement from '@root/components/formatted/formattedAchievement';
import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import GameLogo from '@root/components/gameLogo';
import Page from '@root/components/page/page';
import StyledTooltip from '@root/components/page/styledTooltip';
import { DataTableOffline } from '@root/components/tables/dataTable';
import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import Dimensions from '@root/constants/dimensions';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { getRarityColor, getRarityFromStats, getRarityText, getRarityTooltip } from '@root/helpers/achievementRarity';
import { countUsersWhoCompletedOneLevel } from '@root/helpers/countUsersWhoCompletedOneLevel';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import cleanUser from '@root/lib/cleanUser';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import { USER_DEFAULT_PROJECTION } from '@root/models/constants/projections';
import Achievement from '@root/models/db/achievement';
import User from '@root/models/db/user';
import { AchievementModel, UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Image from 'next/image';
import { useContext, useMemo, useState } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      notFound: true,
    };
  }

  const { type } = context.query;
  const gameId = getGameIdFromReq(context.req);
  const isViewingFromThinky = gameId === GameId.THINKY;

  // When viewing from THINKY, get achievements from all games for master view
  // Include THINKY for social achievements, other games for other achievement types
  const gameIds = [GameId.THINKY, GameId.PATHOLOGY, GameId.SOKOPATH];

  const [myAchievements, allAchievementsData, totalActiveUsers] = await Promise.all([
    // Get user's achievements for this type across relevant games
    AchievementModel.find({
      userId: reqUser._id,
      type: type as string,
      gameId: { $in: gameIds }
    }),
    // Get achievements with both total count and limited results per game
    AchievementModel.aggregate([
      { $match: { type: type as string, gameId: { $in: gameIds } } },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          countsByGame: [
            { $group: { _id: '$gameId', count: { $sum: 1 } } }
          ],
          ...gameIds.reduce((acc, gameId) => ({
            ...acc,
            [`${gameId}_achievements`]: [
              { $match: { gameId } },
              { $sort: { createdAt: -1 } },
              { $limit: 100 },
              {
                $lookup: {
                  from: UserModel.collection.name,
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'userId',
                  pipeline: [
                    { $project: USER_DEFAULT_PROJECTION },
                  ],
                },
              },
              { $unwind: { path: '$userId' } },
            ]
          }), {})
        }
      }
    ]),
    // Get total count of active users (users with calcLevelsCompletedCount > 0)
    countUsersWhoCompletedOneLevel(),
  ]);

  const totalAchievementCount = allAchievementsData[0]?.totalCount[0]?.count || 0;
  const countsByGame = allAchievementsData[0]?.countsByGame || [];

  // Merge achievements from all games, maintaining the last 100 per game structure
  const allAchievements: Achievement[] = [];
  const achievementsByGame: Record<string, Achievement[]> = {};

  // Collect achievements from each game (already limited to 100 per game)
  gameIds.forEach(gameId => {
    const gameAchievements = allAchievementsData[0]?.[`${gameId}_achievements`] || [];

    achievementsByGame[`${gameId}_achievements`] = gameAchievements;
    allAchievements.push(...gameAchievements);
  });

  // Sort all achievements by creation date (most recent first)
  allAchievements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const achievement of allAchievements) {
    cleanUser(achievement.userId);
  }

  return {
    props: {
      type: type as string,
      gameId,
      isViewingFromThinky,
      totalActiveUsers,
      totalAchievementCount,
      countsByGame: JSON.parse(JSON.stringify(countsByGame)),
      achievementsByGame: JSON.parse(JSON.stringify(achievementsByGame)),
      myAchievements: JSON.parse(JSON.stringify(myAchievements)),
      achievements: JSON.parse(JSON.stringify(allAchievements)),
    },
  };
}

/* istanbul ignore next */
export default function AchievementPage({
  type,
  gameId,
  isViewingFromThinky,
  totalActiveUsers,
  totalAchievementCount,
  countsByGame,
  achievementsByGame,
  myAchievements,
  achievements
}: {
  type: AchievementType,
  gameId: GameId,
  isViewingFromThinky: boolean,
  totalActiveUsers: number,
  totalAchievementCount: number,
  countsByGame: Array<{ _id: GameId; count: number }>,
  achievementsByGame: Record<string, Achievement[]>,
  myAchievements: Achievement[],
  achievements: Achievement[]
}) {
  const { game } = useContext(AppContext);
  const [selectedGame, setSelectedGame] = useState<GameId | 'all'>(gameId !== GameId.THINKY ? gameId : 'all');

  // Filter achievements based on selected game
  const filteredAchievements = useMemo(() => {
    if (selectedGame === 'all') {
      return achievements;
    }

    // Return the specific achievements for the selected game (already limited to 100)
    return achievementsByGame[`${selectedGame}_achievements`] || [];
  }, [achievements, achievementsByGame, selectedGame]);

  // Get user's achievement for display (first one found, or for specific game if filtered)
  const displayAchievement = useMemo(() => {
    if (!isViewingFromThinky) {
      return myAchievements[0];
    }

    if (selectedGame === 'all') {
      return myAchievements[0]; // Show first achievement found
    }

    return myAchievements.find(ach => ach.gameId === selectedGame);
  }, [myAchievements, selectedGame, isViewingFromThinky]);

  // Check if this achievement type is available across multiple games
  const shouldShowGameFilters = useMemo(() => {
    // Find which category this achievement type belongs to
    let achievementCategory: AchievementCategory | null = null;

    for (const [category, categoryAchievements] of Object.entries(AchievementCategoryMapping)) {
      if (type in categoryAchievements) {
        achievementCategory = category as AchievementCategory;
        break;
      }
    }

    if (!achievementCategory) return false;

    // Social achievements are only on THINKY, so no need for game filters
    if (achievementCategory === AchievementCategory.SOCIAL) return false;

    // For non-social achievements, check if they exist in multiple games
    const gamesWithCategory = [GameId.PATHOLOGY, GameId.SOKOPATH].filter(gId => {
      const gameInfo = Games[gId];

      return gameInfo.achievementCategories.includes(achievementCategory!);
    });

    return gamesWithCategory.length > 1;
  }, [type]);

  // Calculate stats for game tiles
  const gameStats = useMemo(() => {
    if (!shouldShowGameFilters) return [];

    // For non-social achievements, show stats for both games
    const relevantGameIds = [GameId.PATHOLOGY, GameId.SOKOPATH];

    const stats = relevantGameIds.map(gId => {
      const gameInfo = Games[gId];
      const userHasAchievement = myAchievements.some(ach => ach.gameId === gId);
      const gameCount = countsByGame.find(c => c._id === gId)?.count || 0;

      return {
        gameId: gId,
        name: gameInfo.displayName,
        logo: gameInfo.logoPng,
        count: gameCount,
        unlocked: userHasAchievement
      };
    });

    // Add "All Games" option if there are multiple games
    if (stats.length > 1) {
      stats.unshift({
        gameId: 'all' as GameId,
        name: 'All Games',
        logo: '/logos/thinky/thinky_small.png',
        count: totalAchievementCount,
        unlocked: myAchievements.length > 0
      });
    }

    return stats;
  }, [countsByGame, myAchievements, shouldShowGameFilters, totalAchievementCount]);

  // Calculate rarity based on total achievement count for selected game/filter
  const displayedAchievementCount = useMemo(() => {
    if (selectedGame === 'all' || !isViewingFromThinky) {
      return totalAchievementCount;
    }

    return countsByGame.find(c => c._id === selectedGame)?.count || 0;
  }, [countsByGame, selectedGame, isViewingFromThinky, totalAchievementCount]);

  const rarity = getRarityFromStats(displayedAchievementCount, totalActiveUsers);
  const rarityText = getRarityText(rarity);
  const rarityColor = getRarityColor(rarity);
  const rarityTooltip = getRarityTooltip(rarity, displayedAchievementCount, totalActiveUsers);

  return (
    <Page title='Viewing Achievement'>
      <div className='flex flex-col items-center justify-center w-full p-3 space-y-6'>
        {/* Achievement Display */}
        <div className='flex flex-col items-center gap-4'>
          <FormattedAchievement
            achievementType={type}
            game={selectedGame === 'all' ? game : Games[selectedGame as GameId]}
            createdAt={displayAchievement?.createdAt}
            unlocked={!!displayAchievement}
          />
          
          {/* Rarity Display */}
          <div className='flex items-center gap-4 text-center'>
            <div className='bg-2 rounded-lg px-4 py-2 border border-color-3'>
              <div className='text-sm opacity-75 mb-1'>Rarity</div>
              <div
                className={`text-lg font-bold ${rarityColor}`}
                data-tooltip-content={rarityTooltip}
                data-tooltip-id={'achievement-rarity-tooltip'}
              >
                {rarityText}
                <StyledTooltip id={'achievement-rarity-tooltip'} />
              </div>
            </div>
            <div className='bg-2 rounded-lg px-4 py-2 border border-color-3'>
              <div className='text-sm opacity-75 mb-1'>Players</div>
              <div className='text-lg font-bold'>
                {displayedAchievementCount}
              </div>
            </div>
          </div>
        </div>
        {/* Game Filter Tiles - only show when viewing from THINKY and achievement exists in multiple games */}
        {shouldShowGameFilters && gameStats.length > 0 && (
          <div className='bg-2 rounded-xl p-4 border border-color-3 w-full max-w-4xl'>
            <div className='mb-3'>
              <h3 className='text-lg font-semibold'>Filter by Game</h3>
              <p className='text-sm opacity-75'>View achievements from specific games or across all games</p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
              {gameStats.map((gameStat) => (
                <button
                  key={gameStat.gameId}
                  onClick={() => setSelectedGame(gameStat.gameId)}
                  className={`p-4 rounded-lg border transition-all hover:border-blue-500 ${
                    selectedGame === gameStat.gameId
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-color-4 bg-3 hover:bg-4'
                  }`}
                >
                  <div className='flex flex-col items-center gap-3'>
                    <Image
                      src={gameStat.logo}
                      alt={gameStat.name}
                      width={40}
                      height={40}
                      className='rounded'
                    />
                    <div className='text-center'>
                      <div className='font-semibold text-sm'>{gameStat.name}</div>
                      <div className='text-xs opacity-75'>
                        {gameStat.count} {gameStat.count === 1 ? 'user' : 'users'}
                      </div>
                      {gameStat.unlocked && (
                        <div className='text-xs text-green-500 font-medium'>✓ Unlocked</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Achievements Table */}
        <div className='w-full max-w-6xl'>
          {filteredAchievements.length >= 100 && (
            <div className='mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center'>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                <strong>{displayedAchievementCount}</strong> users have earned this achievement.
                Displaying the <strong>last 100 users</strong> who earned it.
              </p>
            </div>
          )}
          <DataTableOffline
            key={selectedGame} // Reset pagination when game filter changes
            columns={[
              // Add game logo column when viewing from THINKY and achievement exists in multiple games
              ...(shouldShowGameFilters ? [{
                id: 'game',
                name: 'Game',
                selector: (row: Achievement) => (
                  <GameLogo
                    gameId={row.gameId as GameId}
                    id={`game-${row._id}`}
                    size={24}
                    tooltip={true}
                    clickable={true}
                  />
                ),
                sortable: false,
              }] : []),
              {
                id: 'user',
                name: 'User',
                selector: (row: Achievement) => <FormattedUser id='following' size={Dimensions.AvatarSizeSmall} user={row.userId as User} />,
                sortable: false,
              },
              {
                id: 'when-follow',
                name: 'Date Earned',
                selector: (row: Achievement) => <FormattedDate date={row.createdAt} />,
                sortable: false,
              },
            ]}
            data={filteredAchievements}
            itemsPerPage={25}
            noDataComponent={<div className='text-gray-500 dark:text-gray-400'>No users to show</div>}
          />
        </div>
      </div>
    </Page>
  );
}
