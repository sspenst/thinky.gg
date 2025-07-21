import { NextApiRequest, NextApiResponse } from 'next';
// We need to import the actual function - let's copy it here for debugging
import { GameId } from '@root/constants/GameId';
import { GameType } from '@root/constants/Games';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import mongoose from 'mongoose';
import { LevelModel, PlayAttemptModel, StatModel } from '@root/models/mongoose';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';

// Debug endpoint to test the actual API response
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, gameId, timeFilter } = req.query;
  
  if (!userId || !gameId) {
    return res.status(400).json({ 
      error: 'Missing required parameters. Usage: /api/debug/test-prostats?userId=USER_ID&gameId=GAME_ID&timeFilter=7d' 
    });
  }
  
  try {
    console.log('🔍 Testing getDifficultyDataComparisons with:', { userId, gameId, timeFilter });
    
    // Copy the function from the main API file for direct testing
    const result = await testGetDifficultyDataComparisons(gameId as GameId, userId as string, timeFilter as string);
    
    console.log(`✅ API returned ${result ? result.length : 0} items`);
    
    const response = {
      query: { userId, gameId, timeFilter },
      resultCount: result ? result.length : 0,
      sampleData: result && result.length > 0 ? result.slice(0, 2) : null,
      structure: result && result.length > 0 ? {
        fields: Object.keys(result[0]),
        sampleValues: result[0]
      } : null,
      validation: {
        hasData: result && result.length > 0,
        requiredFields: result && result.length > 0 ? {
          _id: !!result[0]._id,
          name: !!result[0].name,
          slug: !!result[0].slug,
          difficulty: !!result[0].difficulty,
          ts: !!result[0].ts,
          myPlayattemptsSumDuration: !!result[0].myPlayattemptsSumDuration,
          otherPlayattemptsAverageDuration: !!result[0].otherPlayattemptsAverageDuration,
          calc_playattempts_just_beaten_count: !!result[0].calc_playattempts_just_beaten_count
        } : null
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    
    res.status(500).json({
      error: 'API test failed',
      message: error.message,
      stack: error.stack
    });
  }
}

// Copy of the main function for direct testing
function getTimeFilterCutoff(timeFilter?: string): number | null {
  if (!timeFilter) return null;
  
  const now = Math.floor(Date.now() / 1000);
  
  switch (timeFilter) {
    case '7d':
      return now - (60 * 60 * 24 * 7);
    case '30d':
      return now - (60 * 60 * 24 * 30);
    case '1y':
      return now - (60 * 60 * 24 * 365);
    default:
      return null;
  }
}

async function testGetDifficultyDataComparisons(gameId: GameId, userId: string, timeFilter?: string) {
  // Copy the exact logic from the main API but with even more detailed logging
  console.log('🚀 Starting testGetDifficultyDataComparisons');
  console.log('📋 Parameters:', { gameId, userId, timeFilter });
  
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const timeCutoff = getTimeFilterCutoff(timeFilter);
  
  console.log('🎯 Using difficulty field:', difficultyEstimate);
  console.log('⏰ Time cutoff:', timeCutoff);
  
  const matchStage: any = {
    userId: new mongoose.Types.ObjectId(userId),
    complete: true,
    isDeleted: { $ne: true },
    gameId: gameId
  };
  
  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }
  
  console.log('🔍 Step 1: matchStage =', JSON.stringify(matchStage, null, 2));
  
  // Step 1: Test basic match
  const basicStats = await StatModel.find(matchStage).limit(5);
  console.log(`🔍 Step 1: Basic stats found: ${basicStats.length}`);
  
  if (basicStats.length === 0) {
    console.log('❌ No stats found in basic match - returning empty array');
    return [];
  }
  
  console.log('📋 Sample basic stat:', JSON.stringify({
    _id: basicStats[0]._id,
    userId: basicStats[0].userId,
    levelId: basicStats[0].levelId,
    complete: basicStats[0].complete,
    ts: basicStats[0].ts,
    gameId: basicStats[0].gameId
  }, null, 2));
  
  // Step 2: Test with level lookup
  console.log('🔍 Step 2: Testing level lookup...');
  const withLevels = await StatModel.aggregate([
    { $match: matchStage },
    { $sort: { userId: 1, ts: -1 } },
    { $limit: 3 }, // Small limit for testing
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level'
      },
    },
    { $unwind: '$level' }
  ]);
  
  console.log(`🔍 Step 2: With basic level lookup: ${withLevels.length} items`);
  
  if (withLevels.length > 0) {
    console.log('📋 Sample level lookup result:', {
      levelId: withLevels[0].levelId,
      levelName: withLevels[0].level?.name,
      levelDifficulty: withLevels[0].level?.[difficultyEstimate],
      levelUniqueUsers: withLevels[0].level?.calc_playattempts_unique_users
    });
  }
  
  if (withLevels.length === 0) {
    console.log('❌ No levels found in lookup - level data missing');
    return [];
  }
  
  // Step 3: Test with difficulty filter
  console.log('🔍 Step 3: Testing difficulty filter...');
  const withDifficultyFilter = await StatModel.aggregate([
    { $match: matchStage },
    { $sort: { userId: 1, ts: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $exists: true, $gte: 0 }
            }
          }
        ]
      },
    },
    { $unwind: '$level' }
  ]);
  
  console.log(`🔍 Step 3: With difficulty filter (>= 0): ${withDifficultyFilter.length} items`);
  
  if (withDifficultyFilter.length === 0) {
    console.log(`❌ No levels found with ${difficultyEstimate} >= 0`);
    
    // Let's check what difficulty values exist
    const sampleLevel = await LevelModel.findOne({ _id: withLevels[0]?.levelId });
    if (sampleLevel) {
      console.log('📋 Sample level difficulty fields:', {
        calc_difficulty_estimate: sampleLevel.calc_difficulty_estimate,
        calc_difficulty_completion_estimate: sampleLevel.calc_difficulty_completion_estimate,
        difficultyEstimateField: difficultyEstimate,
        targetFieldValue: sampleLevel[difficultyEstimate]
      });
    }
    
    return [];
  }
  
  // Step 4: Test with unique users filter  
  console.log('🔍 Step 4: Testing unique users filter...');
  const withUsersFilter = await StatModel.aggregate([
    { $match: matchStage },
    { $sort: { userId: 1, ts: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $exists: true, $gte: 0 },
              calc_playattempts_unique_users: { $gte: 5 }
            }
          }
        ]
      },
    },
    { $unwind: '$level' }
  ]);
  
  console.log(`🔍 Step 4: With unique users >= 5 filter: ${withUsersFilter.length} items`);
  
  if (withUsersFilter.length === 0) {
    console.log('❌ No levels found with >= 5 unique users');
    
    // Check what unique user counts exist
    if (withDifficultyFilter.length > 0) {
      console.log('📋 Sample unique users counts:', withDifficultyFilter.slice(0, 3).map(item => ({
        levelName: item.level.name,
        uniqueUsers: item.level.calc_playattempts_unique_users
      })));
    }
    
    // Try with lower threshold
    const withLowerThreshold = await StatModel.aggregate([
      { $match: matchStage },
      { $sort: { userId: 1, ts: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: LevelModel.collection.name,
          localField: 'levelId',
          foreignField: '_id',
          as: 'level',
          pipeline: [
            {
              $match: {
                [difficultyEstimate]: { $exists: true, $gte: 0 },
                calc_playattempts_unique_users: { $gte: 1 }
              }
            }
          ]
        },
      },
      { $unwind: '$level' }
    ]);
    
    console.log(`🔍 Step 4b: With unique users >= 1 filter: ${withLowerThreshold.length} items`);
    
    if (withLowerThreshold.length === 0) {
      return [];
    }
    
    console.log('⚠️ Using lower threshold (>= 1 unique users) temporarily');
    var finalUsersThreshold = 1;
  } else {
    var finalUsersThreshold = 5;
  }
  
  console.log(`🔍 Proceeding with >= ${finalUsersThreshold} unique users threshold`);
  
  // Final simplified test
  console.log('🔍 Step 5: Testing final simplified query...');
  const finalResult = await StatModel.aggregate([
    {
      $match: matchStage,
    },
    {
      $sort: { userId: 1, ts: -1 }
    },
    { $limit: 2 }, // Very small limit for testing
    {
      $lookup: {
        from: LevelModel.collection.name,
        localField: 'levelId',
        foreignField: '_id',
        as: 'level',
        pipeline: [
          {
            $match: {
              [difficultyEstimate]: { $exists: true, $gte: 0 },
              calc_playattempts_unique_users: { $gte: finalUsersThreshold }
            }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              difficulty: `$${difficultyEstimate}`,
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
            }
          }
        ]
      },
    },
    {
      $unwind: '$level',
    },
    {
      $project: {
        _id: '$level._id',
        name: '$level.name',
        slug: '$level.slug', 
        difficulty: '$level.difficulty',
        ts: 1,
        calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        // Simplified - no PlayAttempt lookup for now
        myPlayattemptsSumDuration: 999, // Mock value
        otherPlayattemptsAverageDuration: 888, // Mock value
      },
    }
  ]);
  
  console.log(`🔍 Step 5: Final simplified result: ${finalResult.length} items`);
  
  if (finalResult.length > 0) {
    console.log('✅ Final result sample:', JSON.stringify(finalResult[0], null, 2));
    return finalResult;
  } else {
    console.log('❌ No results from final query');
    return [];
  }
}