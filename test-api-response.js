// Simple test to check API response structure
// This simulates what the frontend components expect vs what the API returns

// Mock API response structure from the old working version
const expectedApiResponse = {
  'difficulty-levels-comparisons': [
    {
      _id: 'level_id_123',
      name: 'Test Level',
      slug: 'test-level', 
      difficulty: 1250,
      ts: 1640995200,
      myPlayattemptsSumDuration: 45.5,
      otherPlayattemptsAverageDuration: 32.1,
      calc_playattempts_just_beaten_count: 150
    }
  ]
};

// Test what the frontend components are trying to access
function testFrontendDataAccess(apiResponse) {
  console.log('🧪 Testing Frontend Component Data Access...\n');
  
  const comparisons = apiResponse['difficulty-levels-comparisons'];
  
  if (!comparisons || !Array.isArray(comparisons)) {
    console.log('❌ No comparisons array found');
    return;
  }
  
  console.log(`✅ Found ${comparisons.length} comparison items`);
  
  if (comparisons.length === 0) {
    console.log('❌ Comparisons array is empty');
    return;
  }
  
  const sample = comparisons[0];
  console.log('📋 Sample comparison item:');
  console.log(JSON.stringify(sample, null, 2));
  
  // Test Performance Overview requirements
  console.log('\n🔸 Testing Performance Overview requirements...');
  const performanceTests = [
    { field: 'otherPlayattemptsAverageDuration', required: true },
    { field: 'myPlayattemptsSumDuration', required: true },
    { field: 'difficulty', required: true }
  ];
  
  performanceTests.forEach(test => {
    const hasField = sample[test.field] !== undefined;
    const hasValue = sample[test.field] > 0;
    console.log(`  ${test.field}: ${hasField ? '✅' : '❌'} exists, ${hasValue ? '✅' : '❌'} has value (${sample[test.field]})`);
  });
  
  // Test calculation that Performance Overview does
  const validComparisons = comparisons.filter(c => 
    c.otherPlayattemptsAverageDuration && c.myPlayattemptsSumDuration
  );
  console.log(`  Valid comparisons for calculation: ${validComparisons.length}`);
  
  if (validComparisons.length > 0) {
    const avgPerformance = validComparisons.reduce((sum, c) => 
      sum + (c.otherPlayattemptsAverageDuration / c.myPlayattemptsSumDuration), 0
    ) / validComparisons.length;
    console.log(`  ✅ Can calculate avgPerformance: ${avgPerformance.toFixed(2)}`);
  }
  
  // Test Peer Comparisons requirements
  console.log('\n🔸 Testing Peer Comparisons requirements...');
  const peerTests = [
    { field: 'difficulty', required: true },
    { field: 'otherPlayattemptsAverageDuration', required: true },
    { field: 'myPlayattemptsSumDuration', required: true }
  ];
  
  peerTests.forEach(test => {
    const hasField = sample[test.field] !== undefined;
    console.log(`  ${test.field}: ${hasField ? '✅' : '❌'} exists`);
  });
  
  // Test Level Mastery requirements  
  console.log('\n🔸 Testing Level Mastery requirements...');
  const masteryTests = [
    { field: '_id', required: true },
    { field: 'name', required: true },
    { field: 'slug', required: true },
    { field: 'difficulty', required: true },
    { field: 'ts', required: true },
    { field: 'myPlayattemptsSumDuration', required: false },
    { field: 'otherPlayattemptsAverageDuration', required: false }
  ];
  
  masteryTests.forEach(test => {
    const hasField = sample[test.field] !== undefined;
    console.log(`  ${test.field}: ${hasField ? '✅' : '❌'} exists`);
  });
  
  // Test Time Analytics requirements
  console.log('\n🔸 Testing Time Analytics requirements...');
  const timeTests = [
    { field: 'difficulty', required: true },
    { field: 'myPlayattemptsSumDuration', required: true },
    { field: 'otherPlayattemptsAverageDuration', required: true },
    { field: 'ts', required: true }
  ];
  
  timeTests.forEach(test => {
    const hasField = sample[test.field] !== undefined;
    console.log(`  ${test.field}: ${hasField ? '✅' : '❌'} exists`);
  });
}

// Test with expected structure
console.log('Testing with EXPECTED API response structure:');
testFrontendDataAccess(expectedApiResponse);

console.log('\n' + '='.repeat(60) + '\n');

// Test with potentially broken structure
const potentiallyBrokenResponse = {
  'difficulty-levels-comparisons': []
};

console.log('Testing with EMPTY API response structure:');
testFrontendDataAccess(potentiallyBrokenResponse);

console.log('\n' + '='.repeat(60) + '\n');

// Test with missing fields structure
const missingFieldsResponse = {
  'difficulty-levels-comparisons': [
    {
      _id: 'level_id_123',
      name: 'Test Level',
      difficulty: 1250,
      // Missing: slug, ts, myPlayattemptsSumDuration, otherPlayattemptsAverageDuration
    }
  ]
};

console.log('Testing with MISSING FIELDS API response structure:');
testFrontendDataAccess(missingFieldsResponse);

// Export for testing with actual API responses
module.exports = { testFrontendDataAccess };