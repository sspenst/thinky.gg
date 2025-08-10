import { sendGTMEvent } from '@next/third-parties/google';
import isPro from '@root/helpers/isPro';
import { Router } from 'next/router';
import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import User from '../models/db/user';

export function usePostHogAnalytics(user: User | null | undefined) {
  const [isInitialized, setIsInitialized] = useState(false);
  const lastIdentifiedUser = useRef<string | null>(null);
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') && window.location.port === '3000');

  // Initialize PostHog once
  useEffect(() => {
    if (isLocalhost || isInitialized) return;

    posthog.init((process.env.NEXT_PUBLIC_POSTHOG_KEY as string) || 'phc_Am38672etY9vtglKkfMa86HVxREbLuh7ExC7Qj1qPBx', {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST as string || '/api/ingest',
      person_profiles: 'always',
      capture_pageview: false,
    });

    posthog.capture('$pageview');
    setIsInitialized(true);

    const handleRouteChange = () => posthog?.capture('$pageview');

    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [isLocalhost, isInitialized]);

  // Handle user identification with stability checks
  useEffect(() => {
    if (!isInitialized || isLocalhost) return;

    const currentUserId = user?._id?.toString();

    // Only act if user ID actually changed
    if (lastIdentifiedUser.current === currentUserId) return;

    if (currentUserId) {
      sendGTMEvent({
        'event': 'userId_set',
        'user_id': currentUserId
      });

      // Identify user with PostHog - only include stable properties
      posthog.identify(currentUserId, {
        name: user?.name,
        email: user?.email || '',
        roles: user?.roles,
        created_at: user?.ts ? new Date(user.ts * 1000).toISOString() : undefined,
        has_pro: isPro(user),
        email_confirmed: user?.emailConfirmed,
      });
      lastIdentifiedUser.current = currentUserId;
    } else if (lastIdentifiedUser.current !== null) {
      // Only reset if we were previously identified
      posthog.reset();
      lastIdentifiedUser.current = null;
    }
  }, [isInitialized, user?._id, isLocalhost]); // Minimal deps - only ID matters

  return { isInitialized };
}
