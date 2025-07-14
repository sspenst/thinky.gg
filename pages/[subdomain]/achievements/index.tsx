import { AchievementCategoryMapping } from '@root/constants/achievements/achievementInfo';
import AchievementType from '@root/constants/achievements/achievementType';
import { AppContext } from '@root/contexts/appContext';
import { getAchievementCategoryDisplayName } from '@root/helpers/achievementCategoryDisplayNames';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import dbConnect from '@root/lib/dbConnect';
import { getUserFromToken } from '@root/lib/withAuth';
import Achievement from '@root/models/db/achievement';
import { AchievementModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useContext, useState } from 'react';
import AchievementsBrowser from '../../../components/achievements/achievementsBrowser';
import Page from '../../../components/page/page';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  let userAchievements: Achievement[] = [];

  if (reqUser) {
    userAchievements = await AchievementModel.find({
      userId: reqUser._id,
      gameId: gameId
    }).lean<Achievement[]>();
  }

  // Get achievement statistics
  const achievementStats = await AchievementModel.aggregate([
    { $match: { gameId: gameId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        firstEarned: { $min: '$createdAt' },
        lastEarned: { $max: '$createdAt' }
      }
    }
  ]);

  // Get total counts by category
  const totalAchievements = Object.keys(AchievementCategoryMapping).reduce((acc, category) => {
    const categoryAchievements = AchievementCategoryMapping[category];

    acc[category] = Object.keys(categoryAchievements).length;

    return acc;
  }, {} as Record<string, number>);

  return {
    props: {
      userAchievements: JSON.parse(JSON.stringify(userAchievements)),
      achievementStats: JSON.parse(JSON.stringify(achievementStats)),
      totalAchievements,
      reqUser: reqUser ? {
        _id: reqUser._id.toString(),
        name: reqUser.name
      } : null,
    },
  };
}

interface AchievementsPageProps {
  userAchievements: Achievement[];
  achievementStats: Array<{
    _id: AchievementType;
    count: number;
    firstEarned: Date;
    lastEarned: Date;
  }>;
  totalAchievements: Record<string, number>;
  reqUser: { _id: string; name: string } | null;
}

export default function AchievementsPage({
  userAchievements,
  achievementStats,
  totalAchievements,
  reqUser
}: AchievementsPageProps) {
  const { game } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterUnlocked, setFilterUnlocked] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Calculate user progress
  const userUnlockedCount = userAchievements.length;
  const totalAvailable = Object.values(totalAchievements).reduce((sum, count) => sum + count, 0);
  const progressPercentage = totalAvailable > 0 ? Math.round((userUnlockedCount / totalAvailable) * 100) : 0;

  return (
    <Page title='Achievements'>
      <div className='flex flex-col gap-6 p-4 max-w-7xl mx-auto'>
        {/* Header Section */}
        <div className='text-center space-y-4'>
          <h1 className='text-4xl font-bold'>🏆 Achievements</h1>
          <p className='text-lg opacity-75'>
            Track your progress and unlock achievements as you play!
          </p>
          
          {reqUser && (
            <div className='bg-2 rounded-xl p-6 border border-color-3'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div className='text-center sm:text-left'>
                  <h2 className='text-2xl font-bold'>{reqUser.name}&apos;s Progress</h2>
                  <p className='text-lg'>
                    {userUnlockedCount} of {totalAvailable} achievements unlocked
                  </p>
                </div>
                <div className='flex flex-col items-center gap-2'>
                  <div className='text-3xl font-bold text-blue-500'>{progressPercentage}%</div>
                  <div className='w-32 h-3 bg-3 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500'
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Search and Filter Controls */}
        <div className='bg-2 rounded-xl p-4 border border-color-3'>
          <div className='flex flex-col lg:flex-row gap-4 items-center'>
            {/* Search Input */}
            <div className='flex-1 w-full lg:w-auto'>
              <input
                type='text'
                placeholder='Search achievements...'
                className='w-full px-4 py-3 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Category Filter */}
            <select
              className='px-4 py-3 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors min-w-[150px]'
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value='all'>All Categories</option>
              {Object.keys(totalAchievements).map(category => (
                <option key={category} value={category}>
                  {getAchievementCategoryDisplayName(category)}
                </option>
              ))}
            </select>
            {/* Status Filter */}
            {reqUser && (
              <select
                className='px-4 py-3 rounded-lg bg-3 border border-color-4 focus:border-blue-500 focus:outline-none transition-colors min-w-[150px]'
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
        {/* Achievements Browser */}
        <AchievementsBrowser
          userAchievements={userAchievements}
          achievementStats={achievementStats}
          game={game}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          filterUnlocked={filterUnlocked}
          totalAchievements={totalAchievements}
        />
      </div>
    </Page>
  );
}
