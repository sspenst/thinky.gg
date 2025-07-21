// Simple test script to call our debug API endpoint directly
const https = require('https');
const http = require('http');

// Test the debug endpoint we created
const testUrl = 'http://localhost:3000/api/debug/test-prostats?userId=SAMPLE_USER_ID&gameId=SAMPLE_GAME_ID&timeFilter=all';

console.log('🔍 Testing API endpoint:', testUrl);
console.log('🔍 This will show the step-by-step debugging logs...\n');

http.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📋 API Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
});