import { logger } from '@root/helpers/logger';

interface ChatAttempt {
  timestamps: number[];
}

// Rate limiting for chat messages
const chatAttempts = new Map<string, ChatAttempt>();
const MAX_MESSAGES_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 7000; // 7 seconds
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();

  for (const [key, data] of chatAttempts.entries()) {
    // Remove timestamps older than window duration
    data.timestamps = data.timestamps.filter(timestamp => now - timestamp < WINDOW_DURATION_MS);

    // If no timestamps left, remove the entry
    if (data.timestamps.length === 0) {
      chatAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function isChatRateLimited(userId: string): boolean {
  const now = Date.now();
  const userAttempts = chatAttempts.get(userId) || { timestamps: [] };

  // Remove old timestamps outside the window
  userAttempts.timestamps = userAttempts.timestamps.filter(timestamp => now - timestamp < WINDOW_DURATION_MS);

  // Check if user has exceeded the limit
  if (userAttempts.timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    logger.warn(`User ${userId} is chat rate limited: ${userAttempts.timestamps.length} messages in last ${WINDOW_DURATION_MS}ms`);

    return true;
  }

  // Add current timestamp and update the map
  userAttempts.timestamps.push(now);
  chatAttempts.set(userId, userAttempts);

  logger.info(`Chat message allowed for user ${userId}: ${userAttempts.timestamps.length}/${MAX_MESSAGES_PER_WINDOW} messages in window`);

  return false;
}
