import { logger } from '@root/helpers/logger';

interface GameStateAttempt {
  timestamps: number[];
}

// Rate limiting for match game state messages (2 per second)
const gameStateAttempts = new Map<string, GameStateAttempt>();
const MAX_MESSAGES_PER_WINDOW = 10; // 10 updates
const WINDOW_DURATION_MS = 1000; // per 1 second
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();

  for (const [key, data] of gameStateAttempts.entries()) {
    // Remove timestamps older than window duration
    data.timestamps = data.timestamps.filter(timestamp => now - timestamp < WINDOW_DURATION_MS);

    // If no timestamps left, remove the entry
    if (data.timestamps.length === 0) {
      gameStateAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function isGameStateRateLimited(userId: string): boolean {
  const now = Date.now();
  const userAttempts = gameStateAttempts.get(userId) || { timestamps: [] };

  // Remove old timestamps outside the window
  userAttempts.timestamps = userAttempts.timestamps.filter(timestamp => now - timestamp < WINDOW_DURATION_MS);

  // Check if user has exceeded the limit
  if (userAttempts.timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    logger.debug?.(`User ${userId} gameState rate limited: ${userAttempts.timestamps.length} in ${WINDOW_DURATION_MS}ms`);

    return true;
  }

  // Add current timestamp and update the map
  userAttempts.timestamps.push(now);
  gameStateAttempts.set(userId, userAttempts);

  return false;
}
