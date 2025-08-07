import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog client singleton
 * Used for tracking server-side events (signups, API calls, etc.)
 */
const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const posthogServer = apiKey
  ? new PostHog(apiKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

/**
 * Helper to safely capture server-side events
 */
export function captureEvent(
  distinctId: string, 
  event: string, 
  properties?: Record<string, any>
) {
  if (!posthogServer) return;
  
  try {
    posthogServer.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    console.error('PostHog server capture error:', error);
  }
}