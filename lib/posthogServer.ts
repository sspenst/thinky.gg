'use server';
import { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side tracking
export const posthogServer = process.env.POSTHOG_PROJECT_API_KEY
  ? new PostHog(process.env.POSTHOG_PROJECT_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
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
