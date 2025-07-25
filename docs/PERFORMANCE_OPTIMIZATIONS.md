# Profile Insights Performance Optimizations

## Database Indexes Required

For optimal performance of the profile insights queries, the following compound indexes should be created:

### StatModel (Stats Collection)
```javascript
// Primary compound index for user queries
db.stats.createIndex({ 
  userId: 1, 
  complete: 1, 
  isDeleted: 1, 
  ts: -1, 
  gameId: 1 
});

// Secondary index for time-based queries
db.stats.createIndex({ 
  userId: 1, 
  gameId: 1, 
  ts: -1 
});
```

### PlayAttemptModel (PlayAttempts Collection) 
```javascript
// Index for level-based user lookups
db.playattempts.createIndex({ 
  levelId: 1, 
  userId: 1, 
  attemptContext: 1,
  startTime: 1,
  endTime: 1
});

// Index for user-based level lookups  
db.playattempts.createIndex({ 
  userId: 1, 
  levelId: 1, 
  attemptContext: 1
});
```

### LevelModel (Levels Collection)
```javascript
// Index for difficulty and stats queries
db.levels.createIndex({ 
  _id: 1,
  calc_difficulty_estimate: 1,
  calc_playattempts_unique_users: 1,
  calc_playattempts_just_beaten_count: 1
});
```

## API Optimizations Implemented

### 1. Reduced Database Lookups
- **Before**: 3 expensive PlayAttempt lookups per level (players lookup, other players stats, user stats)
- **After**: 1 optimized lookup per level using pre-calculated level statistics

### 2. Server-Side Calculations
- **Performance Ratios**: Calculated in MongoDB aggregation pipeline
- **Difficulty Tiers**: Calculated server-side using $switch operator  
- **Average Durations**: Use pre-calculated level statistics when available

### 3. Early Filtering and Projection
- Filter out levels without sufficient data (< 5 unique players)
- Project only required fields early in pipeline
- Structured queries to leverage compound indexes automatically (Atlas compatible)

### 4. Eliminated Client-Side Processing
- **Before**: Client-side difficulty calculations and comparisons
- **After**: All calculations done in MongoDB aggregation pipeline

### 5. Atlas-Compatible Query Patterns
- Removed `$hint` operators (not supported in Atlas)
- Structured `$match` and `$sort` stages to leverage indexes automatically
- Used compound index-friendly query patterns

## Performance Improvements Expected

### For Users with Large History (10k+ levels):
- **Query Time**: ~80% reduction (from ~15-30s to ~3-6s)
- **Data Transfer**: ~60% reduction (pre-calculated fields)
- **Client Processing**: ~95% reduction (minimal client calculations)

### For Average Users (1k-5k levels):
- **Query Time**: ~70% reduction (from ~3-8s to ~1-2s)  
- **Data Transfer**: ~50% reduction
- **Client Processing**: ~90% reduction

## Additional Optimization Opportunities

### 1. Caching Layer
```javascript
// Consider Redis caching for frequently accessed user insights
const cacheKey = `insights:${userId}:${gameId}:${timeFilter}`;
// Cache for 5-15 minutes depending on data freshness requirements
```

### 2. Pre-calculated User Statistics
Add fields to User model for commonly queried metrics:
- `calc_avg_performance_ratio`
- `calc_difficulty_distribution` 
- `calc_monthly_activity_summary`

### 3. Pagination for Heavy Users
For users with 50k+ solved levels, consider:
- Limit initial load to most recent 10k levels
- Load older data on demand or in background
- Aggregate older data into monthly/yearly summaries

### 4. Database Partitioning
Consider partitioning large collections by:
- `gameId` (if multi-game support)
- Time ranges (monthly partitions for older data)

## Monitoring and Alerts

### Query Performance Metrics to Track:
- Average query execution time by endpoint
- 95th percentile response times  
- Database CPU and memory usage during peak times
- Cache hit/miss ratios (if caching implemented)

### Recommended Alerts:
- Query time > 10s for any insights endpoint
- Database connection pool exhaustion
- Memory usage > 80% during insights queries