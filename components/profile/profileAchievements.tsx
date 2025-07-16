import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import Achievement from '@root/models/db/achievement';
import User from '@root/models/db/user';
import { useContext, useMemo } from 'react';
import AchievementsDisplay from '../achievements/achievementsDisplay';

export function ProfileAchievments({ achievements, achievementStats, totalActiveUsers, reqUser }: {
  achievements: Achievement[];
  achievementStats: Array<{
    _id: { type: AchievementType; gameId: GameId };
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  totalActiveUsers: number;
  reqUser: User | null;
}) {
  const { game } = useContext(AppContext);
  // Transform achievements data to match the new component's expected format
  const transformedData = useMemo(() => {
    const userAchievementsByGame: Record<GameId, Achievement[]> = {
      [GameId.THINKY]: [],
      [GameId.PATHOLOGY]: [],
      [GameId.SOKOPATH]: []
    };

    // Group achievements by game
    achievements.forEach(achievement => {
      if (userAchievementsByGame[achievement.gameId]) {
        userAchievementsByGame[achievement.gameId].push(achievement);
      }
    });

    // Use the provided achievement stats

    // Get total counts by category
    const totalAchievements = Object.keys(AchievementCategoryMapping).reduce((acc, category) => {
      const categoryAchievements = AchievementCategoryMapping[category as keyof typeof AchievementCategoryMapping];

      acc[category] = Object.keys(categoryAchievements).length;

      return acc;
    }, {} as Record<string, number>);

    return {
      userAchievementsByGame,
      totalAchievements
    };
  }, [achievements]);

  return (
    <div className='p-3'>
      <AchievementsDisplay
        userAchievements={achievements}
        userAchievementsByGame={transformedData.userAchievementsByGame}
        achievementStats={achievementStats}
        totalAchievements={transformedData.totalAchievements}
        totalActiveUsers={totalActiveUsers}
        reqUser={reqUser ? { _id: reqUser._id.toString(), name: reqUser.name } : null} // Pass through reqUser for locked/unlocked filter
        showProgressSection={false} // Hide the big progress section for profile
        showSearchFilters={true} // Show search/filters for profile
        showGameTiles={true} // Show game selection tiles for profile
        defaultSelectedGame={game.id === GameId.THINKY ? 'all' : game.id} // Default to All Games when viewing from THINKY
      />
    </div>
  );
}
