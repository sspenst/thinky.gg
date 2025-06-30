import { sendGTMEvent } from '@next/third-parties/google';
import isPro from '@root/helpers/isPro';
import { Router } from 'next/router';
import posthog from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import User from '../models/db/user';

function isDiscordEmbed() {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);

  // Check for Discord embed params
  return (
    url.searchParams.has('frame_id') ||
    url.searchParams.has('channel_id') ||
    url.searchParams.has('guild_id') ||
    url.searchParams.has('user_id') ||
    url.searchParams.has('user_token') ||
    url.searchParams.has('session_id') ||
    url.searchParams.has('instance_id')
  );
}

export function usePostHogAnalytics(user: User | null | undefined) {
  const [isInitialized, setIsInitialized] = useState(false);
  const lastIdentifiedUser = useRef<string | null>(null);
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') && window.location.port === '3000');

  // Initialize PostHog once
  useEffect(() => {
    if (isLocalhost || isInitialized) return;

    const apiHost = isDiscordEmbed()
      ? '/.proxy/api/ingest'
      : (process.env.NEXT_PUBLIC_POSTHOG_HOST as string || '/api/ingest');

    posthog.init((process.env.NEXT_PUBLIC_POSTHOG_KEY as string) || 'phc_Am38672etY9vtglKkfMa86HVxREbLuh7ExC7Qj1qPBx', {
      api_host: apiHost,
      person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
      // Enable debug mode in development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
        // Manually capture initial pageview to ensure it's tracked
        posthog.capture('$pageview');
      },
    });
    console.log('POSTHOG_KEY', process.env.NEXT_PUBLIC_POSTHOG_KEY);
    console.log('POSTHOG_HOST', apiHost);
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
