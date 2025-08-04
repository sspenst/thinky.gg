# Level Statistics Fields Documentation

This document provides a comprehensive explanation of the level statistics fields in the Thinky.gg platform, specifically focusing on `calc_stats_players_beaten` and `calc_playattempts_just_beaten_count`.

## Overview

The platform tracks two primary statistics for level completion:
- **`calc_stats_players_beaten`** - Number of unique players who have optimized the level (solved with minimum moves)
- **`calc_playattempts_just_beaten_count`** - Number of times the level has been completed (any valid solution)

## Field Definitions

### `calc_stats_players_beaten`

**Location**: 
- Schema: `models/schemas/levelSchema.ts` (lines 66-70)
- Type definition: `models/db/level.d.ts` (lines 36-38)

**Description**: "Number of users that have solved this level (StatModel has moves === level.leastMoves)"

**Calculation**: 
```javascript
// models/schemas/levelSchema.ts lines 212-221
async function calcStats(level: Level, options?: QueryOptions) {
  const stats = await StatModel.find({
    levelId: level._id,
  }, 'moves', options).lean<Stat[]>();

  return {
    calc_stats_completed_count: stats.length,
    calc_stats_players_beaten: stats.filter((stat) => stat.moves === level.leastMoves).length,
  } as Partial<Level>;
}
```

**Key Characteristics**:
- Counts unique players only
- Requires optimal solution (moves === leastMoves)
- Based on Stat records
- Used for user-facing "solves" count in search results

### `calc_playattempts_just_beaten_count`

**Location**:
- Schema: `models/schemas/levelSchema.ts` (lines 38-41)
- Type definition: `models/db/level.d.ts` (line 26)

**Description**: Count of PlayAttempt records with `attemptContext: AttemptContext.JUST_SOLVED`

**Calculation**:
```javascript
// models/schemas/levelSchema.ts lines 368-371
'calcPlayAttemptsJustBeatenCount': [
  { $match: { attemptContext: AttemptContext.JUST_SOLVED } },
  { $count: 'total' }
]
```

**Key Characteristics**:
- Counts completion attempts (not unique players)
- Includes any valid solution (optimal or not)
- Can count multiple completions by same player
- Used for analytics and difficulty calculations

## Author Inclusion Policy

### Important: Authors ARE Included in Both Statistics

When a level is published, the author is automatically counted as having beaten their own level:

**From `pages/api/publish/[id].ts` (lines 110-111, 130-139)**:
```javascript
// During level publication:
LevelModel.findOneAndUpdate({ _id: level._id, isDraft: true }, {
  $set: {
    calc_stats_completed_count: 1,
    calc_stats_players_beaten: 1,
    isDraft: false,
    ts: ts,
  }
})

// Creates a Stat record for the author:
StatModel.create([{
  _id: new Types.ObjectId(),
  attempts: 1,
  complete: true,
  gameId: level.gameId,
  levelId: level._id,
  moves: level.leastMoves,  // Author gets optimal solution
  ts: ts,
  userId: userId,  // The author's userId
}])
```

### No Author Exclusion Logic

Neither field excludes the author from counts:
- `calcStats()` function counts ALL Stat records without filtering by author
- PlayAttempt aggregation counts ALL JUST_SOLVED attempts without filtering
- No author exclusion found in any calculation pipeline

### Special Case: Record Tracking

The only place where authors receive special treatment is in record tracking (`pages/api/stats/index.ts` lines 258-269):
- Authors don't get `calcRecordsCount` increments for setting records on their own levels
- This doesn't affect `calc_stats_players_beaten` or `calc_playattempts_just_beaten_count`

## When Fields Diverge

These fields will have different values when:

### 1. Non-Optimal Completions
- Player completes level with more than minimum moves
- `calc_playattempts_just_beaten_count` increments
- `calc_stats_players_beaten` does NOT increment

### 2. Multiple Completions by Same Player
- Player completes level multiple times
- `calc_playattempts_just_beaten_count` increments each time
- `calc_stats_players_beaten` only counts the player once

### 3. Progression from Sub-Optimal to Optimal
- Player first completes with 15 moves (minimum is 10)
- `calc_playattempts_just_beaten_count` increments
- Later, same player achieves 10 moves
- `calc_stats_players_beaten` now increments
- Both fields have incremented, but at different times

### 4. New Records Are Set

**Critical Behavior**: When a new record is achieved, `calc_stats_players_beaten` can **DECREASE**!

From `pages/api/stats/index.ts` lines 282-314:
```javascript
// When new record is set (moves < level.leastMoves):
// 1. Find all users who previously had optimal solutions
const stats = await StatModel.find({
  userId: { $ne: userId },  // Exclude the new record holder
  levelId: level._id,
  complete: true,
}, 'userId', { session }).lean<Stat[]>();

// 2. Mark all their stats as incomplete
await StatModel.updateMany(
  { _id: { $in: stats.map(s => s._id) } },
  { $set: { complete: false } },  // No longer optimal!
  { session }
);
```

**Impact on Statistics**:
- All previously "optimal" players are no longer counted in `calc_stats_players_beaten`
- Only the new record holder counts as having "beaten" the level optimally
- `calc_playattempts_just_beaten_count` continues to increment normally
- **ALL PlayAttempts are marked as UNSOLVED** (line 349-353):
  ```javascript
  PlayAttemptModel.updateMany(
    { levelId: level._id },
    { $set: { attemptContext: AttemptContext.UNSOLVED } }
  );
  ```

## Usage in Application

### `calc_stats_players_beaten`
- **Primary use**: User-facing "number of players who solved this level"
- **Search API**: Used when sorting by "solves" (`pages/api/search/index.ts` line 390)
- **Projections**: Included in level search projections (`models/constants/projections.ts` line 22)
- **Meaning**: Represents true mastery of the level (optimal solution found)

### `calc_playattempts_just_beaten_count`
- **Primary use**: Analytics and difficulty calculations
- **ProStats**: Used in professional statistics features
- **Difficulty**: Factors into difficulty estimate calculations
- **Meaning**: Represents engagement and completion attempts

## Practical Examples

### Example 1: New Level Published
```
Initial state after publication:
- Author: UserA published with 10 moves
- calc_stats_players_beaten: 1 (author)
- calc_playattempts_just_beaten_count: 0 (no play attempts yet)
```

### Example 2: First External Player Completes
```
UserB completes with 15 moves (optimal is 10):
- calc_stats_players_beaten: 1 (still just author)
- calc_playattempts_just_beaten_count: 1
```

### Example 3: Same Player Optimizes
```
UserB later achieves 10 moves:
- calc_stats_players_beaten: 2 (author + UserB)
- calc_playattempts_just_beaten_count: 2 (both attempts counted)
```

### Example 4: Multiple Players
```
After many players attempt:
- calc_stats_players_beaten: 15 (unique players with optimal solution)
- calc_playattempts_just_beaten_count: 47 (all completion attempts)
```

### Example 5: New Record Is Set (Critical Case)
```
Current state:
- Level published with 10 moves by UserA
- UserB, UserC, UserD all achieved 10 moves
- calc_stats_players_beaten: 4 (UserA, UserB, UserC, UserD)
- calc_playattempts_just_beaten_count: 23

UserE sets new record with 8 moves:
- UserB, UserC, UserD Stat records marked complete: false
- Only UserA (author) and UserE have optimal solutions
- calc_stats_players_beaten: 2 (DECREASED from 4!)
- calc_playattempts_just_beaten_count: 24 (incremented normally)
- ALL previous PlayAttempts marked as UNSOLVED
```

### Example 6: Players Re-optimize After Record
```
Continuing from Example 5:
UserB achieves 8 moves:
- calc_stats_players_beaten: 3 (UserA, UserE, UserB)
- calc_playattempts_just_beaten_count: 25

UserC and UserD also achieve 8 moves:
- calc_stats_players_beaten: 5 (all players optimized again)
- calc_playattempts_just_beaten_count: 27
```

## Best Practices

1. **For showing "X players solved this level"**: Use `calc_stats_players_beaten`
2. **For analytics on level difficulty**: Consider both fields
3. **For completion rate calculations**: Use ratio of fields to understand optimization rate
4. **Remember**: Authors always count as 1 in `calc_stats_players_beaten` upon publication
5. **Important**: `calc_stats_players_beaten` can DECREASE when new records are set
6. **UI Considerations**: Be prepared for "solves" count to go down, not just up
7. **Historical tracking**: If you need persistent historical data, consider tracking separately from these real-time fields

## Technical Notes

- Both fields are calculated asynchronously via queue jobs
- Updates trigger cache invalidation for search results
- Fields are indexed for performance in search queries
- Aggregation pipelines run on MongoDB for accuracy