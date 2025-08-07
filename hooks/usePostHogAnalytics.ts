import { sendGTMEvent } from '@next/third-parties/google';
import isPro from '@root/helpers/isPro';
import posthog from '@root/lib/posthogClient';
import { Router } from 'next/router';
import { useEffect, useRef } from 'react';
import User from '../models/db/user';

/**
 * Hook to handle PostHog analytics: pageview tracking and user identification
 */
export function usePostHogAnalytics(user: User | null | undefined) {
  const lastIdentifiedUser = useRef<string | null>(null);
  
  // Skip everything on localhost
  const isLocalhost = typeof window !== 'undefined' && 
    window.location.hostname === 'localhost' && 
    window.location.port === '3000';

  // Handle pageview tracking
  useEffect(() => {
    if (isLocalhost) return;

    // Initial pageview
    posthog.capture('$pageview');

    // Track route changes
    const handleRouteChange = () => posthog.capture('$pageview');
    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [isLocalhost]);

  // Handle user identification
  useEffect(() => {
    if (isLocalhost) return;

    const currentUserId = user?._id?.toString();

    // Only update if user ID actually changed
    if (lastIdentifiedUser.current === currentUserId) return;

    if (currentUserId) {
      // Send to GTM
      sendGTMEvent({
        'event': 'userId_set',
        'user_id': currentUserId
      });

      // Identify in PostHog
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
      // User logged out - reset PostHog
      posthog.reset();
      lastIdentifiedUser.current = null;
    }
  }, [user?._id, isLocalhost]);
}