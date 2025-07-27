import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import AchievementType from '@root/constants/achievements/achievementType';
import { countUsersWhoCompletedOneLevel } from '@root/helpers/countUsersWhoCompletedOneLevel';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import { getUserFromToken } from '@root/lib/withAuth';
import Achievement from '@root/models/db/achievement';
import { AchievementModel } from '@root/models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const gameId = getGameIdFromReq(req);
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const reqUser = await getUserFromToken(token, req);

    if (!reqUser) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    // Get user's achievements - same as achievements page
    const userAchievements: Achievement[] = await AchievementModel.find({
      userId: reqUser._id
    }).lean<Achievement[]>();

    // Get achievement statistics and user progress - same as achievements page
    const [achievementStats, totalActiveUsers, levelsSolvedByDifficulty] = await Promise.all([
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
      countUsersWhoCompletedOneLevel(),
      getSolvesByDifficultyTable(gameId, reqUser._id)
    ]);

    // Calculate rolling sum for user's progress
    const rollingLevelSolvesSum = getDifficultyRollingSum(levelsSolvedByDifficulty);

    // Build skill achievements in order
    const skillAchievements = skillRequirements.map(req => {
      const userHasAchievement = userAchievements.some(ach =>
        ach.type === req.achievementType && ach.gameId === gameId
      );

      const statEntry = achievementStats.find(stat =>
        stat._id.type === req.achievementType && stat._id.gameId === gameId
      );

      const userProgress = rollingLevelSolvesSum[req.difficultyIndex] || 0;

      return {
        achievementType: req.achievementType,
        difficultyIndex: req.difficultyIndex,
        requirement: req.levels,
        userProgress,
        isUnlocked: userHasAchievement,
        count: statEntry?.count || 0,
        percentile: statEntry && totalActiveUsers > 0 ? Math.round((statEntry.count / totalActiveUsers) * 100) : 0
      };
    });

    return res.status(200).json({
      skillAchievements,
      totalActiveUsers
    });
  } catch (error) {
    console.error('Error fetching player rank stats:', error);

    return res.status(500).json({ error: 'Internal server error' });
  }
}
