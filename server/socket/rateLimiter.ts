import { logger } from '@root/helpers/logger';

// Rate limiting for rapid reconnections
const connectionAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;
const BLOCK_DURATION_MS = 60000; // 1 minute
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of connectionAttempts.entries()) {
    if (now - data.lastAttempt > CLEANUP_INTERVAL_MS) {
      connectionAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const data = connectionAttempts.get(identifier);
  
  logger.info(`Rate limit check for ${identifier}: existing data = ${JSON.stringify(data)}`);
  
  if (!data) {
    connectionAttempts.set(identifier, { count: 1, lastAttempt: now });
    logger.info(`First connection from ${identifier}, allowing`);
    return false;
  }
  
  // Check if still blocked
  if (data.blockedUntil && now < data.blockedUntil) {
    logger.warn(`${identifier} is still blocked until ${new Date(data.blockedUntil)}`);
    return true;
  }
  
  // Reset count if more than a minute has passed
  if (now - data.lastAttempt > 60000) {
    data.count = 1;
    data.lastAttempt = now;
    delete data.blockedUntil;
    logger.info(`Resetting count for ${identifier} after timeout`);
    return false;
  }
  
  // Increment count
  data.count++;
  data.lastAttempt = now;
  logger.info(`Connection attempt ${data.count} from ${identifier}`);
  
  // Block if exceeded limit
  if (data.count > MAX_CONNECTIONS_PER_MINUTE) {
    data.blockedUntil = now + BLOCK_DURATION_MS;
    logger.warn(`Rate limiting connection attempts from ${identifier} for ${BLOCK_DURATION_MS}ms (attempt ${data.count})`);
    return true;
  }
  
  return false;
}