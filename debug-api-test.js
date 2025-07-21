// Debug script to test the API response structure
// Run with: node debug-api-test.js

const mongoose = require('mongoose');

// Mock the required models and types - you'll need to adjust these paths
const StatModel = require('./models/mongoose').StatModel;
const LevelModel = require('./models/mongoose').LevelModel;
const PlayAttemptModel = require('./models/mongoose').PlayAttemptModel;
const { AttemptContext } = require('./models/schemas/playAttemptSchema');
const { GameId } = require('./constants/GameId');
const { GameType } = require('./constants/Games');
const { getGameFromId } = require('./helpers/getGameIdFromReq');

// Copy the exact function from the API
function getTimeFilterCutoff(timeFilter) {
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

async function testDifficultyDataComparisons(gameId, userId, timeFilter) {
  console.log('🔍 Testing getDifficultyDataComparisons...');
  console.log(`GameId: ${gameId}, UserId: ${userId}, TimeFilter: ${timeFilter}`);
  
  const game = getGameFromId(gameId);
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate';
  const timeCutoff = getTimeFilterCutoff(timeFilter);
  
  console.log(`Difficulty estimate field: ${difficultyEstimate}`);
  console.log(`Time cutoff: ${timeCutoff}`);
  
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    complete: true,
    isDeleted: { $ne: true },
    gameId: gameId
  };
  
  if (timeCutoff) {
    matchStage.ts = { $gt: timeCutoff };
  }
  
  console.log('📊 Match stage:', JSON.stringify(matchStage, null, 2));
  
  // Test step 1: Basic match
  console.log('\n🔸 Step 1: Testing basic match...');
  const basicStats = await StatModel.find(matchStage).limit(5);
  console.log(`Found ${basicStats.length} basic stats`);
  if (basicStats.length > 0) {
    console.log('Sample stat:', JSON.stringify(basicStats[0], null, 2));
  }
  
  // Test step 2: With level lookup
  console.log('\n🔸 Step 2: Testing with level lookup...');
  const withLevels = await StatModel.aggregate([
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
          },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              difficulty: `$${difficultyEstimate}`,
              calc_playattempts_duration_sum: 1,
              calc_playattempts_just_beaten_count: 1,
              calc_playattempts_unique_users: 1,
              calc_avg_duration_all_attempts: 1,
            }
          }
        ]
      },
    },
    { $unwind: '$level' }
  ]);
  
  console.log(`Found ${withLevels.length} stats with levels`);
  if (withLevels.length > 0) {
    console.log('Sample with level:', JSON.stringify(withLevels[0], null, 2));
  }
  
  // Test step 3: Full aggregation pipeline
  console.log('\n🔸 Step 3: Testing full aggregation pipeline...');
  try {
    const fullResult = await StatModel.aggregate([
      {
        $match: matchStage,
      },
      {
        $sort: { userId: 1, ts: -1 }
      },
      { $limit: 2 }, // Limit for testing
      {
        $project: {
          levelId: 1,
          ts: 1,
        },
      },
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
            },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                difficulty: `$${difficultyEstimate}`,
                calc_playattempts_duration_sum: 1,
                calc_playattempts_just_beaten_count: 1,
                calc_playattempts_unique_users: 1,
                calc_avg_duration_all_attempts: 1,
              }
            }
          ]
        },
      },
      {
        $unwind: '$level',
      },
      {
        $lookup: {
          from: PlayAttemptModel.collection.name,
          let: { levelId: '$level._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$levelId', '$$levelId'] },
                    { $eq: ['$userId', new mongoose.Types.ObjectId(userId)] },
                    { $ne: ['$startTime', '$endTime'] },
                  ],
                },
                attemptContext: { $in: [AttemptContext.JUST_SOLVED, AttemptContext.UNSOLVED] },
              },
            },
            {
              $group: {
                _id: '$levelId',
                sumDuration: { $sum: { $subtract: ['$endTime', '$startTime'] } },
                count: { $sum: 1 },
              },
            },
          ],
          as: 'myplayattempts',
        },
      },
      {
        $unwind: {
          path: '$myplayattempts',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $addFields: {
          otherPlayattemptsAverageDuration: {
            $cond: {
              if: { $gt: ['$level.calc_playattempts_just_beaten_count', 1] },
              then: { $divide: ['$level.calc_playattempts_duration_sum', '$level.calc_playattempts_just_beaten_count'] },
              else: null
            }
          }
        }
      },
      {
        $project: {
          _id: '$level._id',
          name: '$level.name',
          slug: '$level.slug', 
          difficulty: '$level.difficulty',
          ts: 1,
          myPlayattemptsSumDuration: '$myplayattempts.sumDuration',
          otherPlayattemptsAverageDuration: 1,
          calc_playattempts_just_beaten_count: '$level.calc_playattempts_just_beaten_count',
        },
      },
      {
        $match: {
          myPlayattemptsSumDuration: { $gt: 0 },
          otherPlayattemptsAverageDuration: { $gt: 0 }
        }
      }
    ]);
    
    console.log(`✅ Full pipeline returned ${fullResult.length} results`);
    if (fullResult.length > 0) {
      console.log('✅ Sample result:', JSON.stringify(fullResult[0], null, 2));
      
      // Validate expected fields
      const sample = fullResult[0];
      const requiredFields = ['_id', 'name', 'slug', 'difficulty', 'ts', 'myPlayattemptsSumDuration', 'otherPlayattemptsAverageDuration'];
      const missingFields = requiredFields.filter(field => sample[field] === undefined);
      
      if (missingFields.length > 0) {
        console.log('❌ Missing required fields:', missingFields);
      } else {
        console.log('✅ All required fields present');
      }
    } else {
      console.log('❌ No results returned from full pipeline');
    }
    
  } catch (error) {
    console.log('❌ Pipeline error:', error.message);
    console.log('Full error:', error);
  }
}

// Test function to run the debug
async function runDebugTest() {
  try {
    // Connect to MongoDB (adjust connection string as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db');
    console.log('📡 Connected to MongoDB');
    
    // Test with actual user ID and game ID from your system
    const testUserId = process.argv[2] || 'USER_ID_HERE';
    const testGameId = process.argv[3] || 'GAME_ID_HERE';
    const testTimeFilter = process.argv[4] || 'all';
    
    if (testUserId === 'USER_ID_HERE') {
      console.log('❌ Please provide userId as first argument: node debug-api-test.js USER_ID GAME_ID');
      process.exit(1);
    }
    
    await testDifficultyDataComparisons(testGameId, testUserId, testTimeFilter);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Export for use in other files or run directly
if (require.main === module) {
  runDebugTest();
}

module.exports = { testDifficultyDataComparisons };