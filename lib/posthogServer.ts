'use server';
import { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side tracking with performance optimizations
export const posthogServer = process.env.POSTHOG_PROJECT_API_KEY
  ? new PostHog(process.env.POSTHOG_PROJECT_API_KEY, {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 20, // Send events in batches of 20 instead of immediately
    flushInterval: 10000, // Send events every 10 seconds
    personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY, // For feature flags if needed
  })
  : null;

// Helper function to safely capture events
export function captureEvent(distinctId: string, event: string, properties?: Record<string, any>) {
  if (posthogServer) {
    try {
      posthogServer.capture({
        distinctId,
        event,
        properties,
      });
    } catch (error) {
      console.error('PostHog capture error:', error);
    }
  }
}

// Graceful shutdown function
export async function shutdownPostHog() {
  if (posthogServer) {
    try {
      await posthogServer.shutdown();
    } catch (error) {
      console.error('PostHog shutdown error:', error);
    }
  }
}

// Ensure PostHog shuts down gracefully when the process exits
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownPostHog);
  process.on('SIGINT', shutdownPostHog);
  process.on('beforeExit', shutdownPostHog);
}
