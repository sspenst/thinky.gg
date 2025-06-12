'use server';
import { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side tracking
// Prefer server-side API key, fall back to public key
const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const posthogServer = apiKey
  ? new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  })
  : null;

// Helper function to safely capture events
export function captureEvent(distinctId: string, event: string, properties?: Record<string, any>) {
  if (posthogServer) {
    posthogServer.capture({
      distinctId,
      event,
      properties,
    });
  }
}
