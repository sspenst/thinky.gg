import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import Achievement from '@root/models/db/achievement';
import { AchievementModel, UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useContext } from 'react';
import AchievementsDisplay from '../../../components/achievements/achievementsDisplay';
import Page from '../../../components/page/page';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  let userAchievements: Achievement[] = [];
  const userAchievementsByGame: Record<GameId, Achievement[]> = {
    [GameId.THINKY]: [],
    [GameId.PATHOLOGY]: [],
    [GameId.SOKOPATH]: []
  };

  if (reqUser) {
    // Get all achievements across all games for this user
    userAchievements = await AchievementModel.find({
      userId: reqUser._id
    }).lean<Achievement[]>();

    // Group achievements by game
    userAchievements.forEach(achievement => {
      if (userAchievementsByGame[achievement.gameId]) {
        userAchievementsByGame[achievement.gameId].push(achievement);
      }
    });
  }

  // Get achievement statistics across all games and total active users
  const [achievementStats, totalActiveUsers] = await Promise.all([
    AchievementModel.aggregate([
      {
        $group: {
          _id: { type: '$type', gameId: '$gameId' },
          count: { $sum: 1 },
          firstEarned: { $min: '$createdAt' },
          lastEarned: { $max: '$createdAt' }
        }
      }
    ]),
    UserModel.countDocuments({})
  ]);

  // Get total counts by category
  const totalAchievements = Object.keys(AchievementCategoryMapping).reduce((acc, category) => {
    const categoryAchievements = AchievementCategoryMapping[category as keyof typeof AchievementCategoryMapping];

    acc[category] = Object.keys(categoryAchievements).length;

    return acc;
  }, {} as Record<string, number>);

  return {
    props: {
      userAchievements: JSON.parse(JSON.stringify(userAchievements)),
      userAchievementsByGame: JSON.parse(JSON.stringify(userAchievementsByGame)),
      achievementStats: JSON.parse(JSON.stringify(achievementStats)),
      totalAchievements,
      totalActiveUsers,
      reqUser: reqUser ? {
        _id: reqUser._id.toString(),
        name: reqUser.name
      } : null,
    },
  };
}

interface AchievementsPageProps {
  userAchievements: Achievement[];
  userAchievementsByGame: Record<GameId, Achievement[]>;
  achievementStats: Array<{
    _id: { type: AchievementType; gameId: GameId };
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  totalAchievements: Record<string, number>;
  totalActiveUsers: number;
  reqUser: { _id: string; name: string } | null;
}

export default function AchievementsPage({
  userAchievements,
  userAchievementsByGame,
  achievementStats,
  totalAchievements,
  totalActiveUsers,
  reqUser
}: AchievementsPageProps) {
  const { game } = useContext(AppContext);

  return (
    <Page title='Achievements'>
      <AchievementsDisplay
        userAchievements={userAchievements}
        userAchievementsByGame={userAchievementsByGame}
        achievementStats={achievementStats}
        totalAchievements={totalAchievements}
        totalActiveUsers={totalActiveUsers}
        reqUser={reqUser}
        showProgressSection={true}
        showSearchFilters={true}
        showGameTiles={false}
        defaultSelectedGame={game.id === GameId.THINKY ? 'all' : game.id}
      />
    </Page>
  );
}
