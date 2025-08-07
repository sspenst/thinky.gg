import posthog from 'posthog-js';

// Simple flag to track if we've initialized
let initialized = false;

/**
 * Initialize PostHog client for browser-side tracking
 * This should only be called once, ideally in _app.tsx
 */
export function initializePostHog() {
  // Skip if already initialized or on server
  if (initialized || typeof window === 'undefined') return;
  
  // Skip on localhost development
  const isLocalhost = window.location.hostname === 'localhost' && window.location.port === '3000';
  if (isLocalhost) {
    console.log('PostHog disabled on localhost:3000');
    return;
  }

  // Use environment variable if available, otherwise use hardcoded key
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_Am38672etY9vtglKkfMa86HVxREbLuh7ExC7Qj1qPBx';

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/api/ingest',
    person_profiles: 'always',
    capture_pageview: false, // We handle this manually in usePostHogAnalytics
  });

  initialized = true;
}

// Export the posthog instance directly - it's already a singleton
export default posthog;