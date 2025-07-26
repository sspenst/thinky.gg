import { GameId } from '@root/constants/GameId';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getDifficultyRollingSum } from '@root/helpers/playerRankHelper';
import { getSolvesByDifficultyTable } from '@root/helpers/getSolvesByDifficultyTable';
import { getUserFromToken } from '@root/lib/withAuth';
import { UserConfigModel } from '@root/models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import { skillRequirements } from '@root/constants/achievements/AchievementRulesSkill';
import { difficultyList } from '@root/components/formatted/formattedDifficulty';
import { Types } from 'mongoose';

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

    // Get all users who have solved at least one level
    const users = await UserConfigModel.find({
      gameId: gameId,
      calcLevelsSolvedCount: { $gt: 0 }
    }).lean();

    if (users.length === 0) {
      return res.status(200).json({ stats: {}, totalActiveUsers: 0 });
    }

    // Calculate ranks for all users (batch process for efficiency)
    const userRankPromises = users.slice(0, 100).map(async user => { // Limit to first 100 for performance
      try {
        const levelsSolvedByDifficulty = await getSolvesByDifficultyTable(gameId, new Types.ObjectId(user.userId.toString()));
        const rollingSum = getDifficultyRollingSum(levelsSolvedByDifficulty);
        
        // Find the highest unlocked skill requirement
        const req = skillRequirements.find(skillRequirement => {
          return rollingSum[skillRequirement.difficultyIndex] >= skillRequirement.levels;
        });

        const rankIndex = req ? req.difficultyIndex : 1; // Default to Kindergarten
        
        return {
          userId: user.userId,
          rankIndex,
          solvedCount: user.calcLevelsSolvedCount
        };
      } catch (error) {
        // Fallback for users with errors
        return {
          userId: user.userId,
          rankIndex: 1, // Default to Kindergarten
          solvedCount: user.calcLevelsSolvedCount
        };
      }
    });

    const userRanks = await Promise.all(userRankPromises);

    // Calculate percentiles for each rank
    const rankStats: { [rankIndex: number]: { count: number; percentile: number } } = {};
    const totalUsers = userRanks.length;

    // Count users at each rank level
    for (let i = 1; i <= 10; i++) { // 1 = Kindergarten, 10 = Super Grandmaster
      const usersAtThisRank = userRanks.filter(user => user.rankIndex === i).length;
      const usersAtOrAboveThisRank = userRanks.filter(user => user.rankIndex >= i).length;
      
      rankStats[i] = {
        count: usersAtThisRank,
        percentile: Math.round((usersAtOrAboveThisRank / totalUsers) * 100)
      };
    }

    // Get current user's rank
    let currentUserRank = 1; // Default to Kindergarten
    
    try {
      const currentUserLevelsSolvedByDifficulty = await getSolvesByDifficultyTable(gameId, reqUser._id);
      const rollingSum = getDifficultyRollingSum(currentUserLevelsSolvedByDifficulty);
      const req = skillRequirements.find(skillRequirement => {
        return rollingSum[skillRequirement.difficultyIndex] >= skillRequirement.levels;
      });
      
      currentUserRank = req ? req.difficultyIndex : 1;
    } catch (error) {
      // Keep default rank on error
    }

    return res.status(200).json({
      stats: rankStats,
      totalActiveUsers: totalUsers,
      currentUserRank,
      rankInfo: difficultyList.slice(1, 11).map((diff, index) => ({
        index: index + 1,
        name: diff.name,
        emoji: diff.emoji,
        description: diff.description
      }))
    });

  } catch (error) {
    console.error('Error fetching player rank stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}