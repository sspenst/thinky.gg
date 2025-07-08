import { sendGTMEvent } from '@next/third-parties/google';
import isPro from '@root/helpers/isPro';
import { Router } from 'next/router';
import posthog from 'posthog-js';
import { useEffect } from 'react';
import User from '../models/db/user';

export function usePostHogAnalytics(user: User | null | undefined) {
  // Initialize PostHog analytics
  useEffect(() => {
    // Don't initialize PostHog for localhost
    if (window.location.hostname === 'localhost') {
      //return;
    }

    posthog.init((process.env.NEXT_PUBLIC_POSTHOG_KEY as string) || 'phc_Am38672etY9vtglKkfMa86HVxREbLuh7ExC7Qj1qPBx', {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST as string || '/api/ingest',
      person_profiles: 'always', // or 'always' to create profiles for anonymous users as well
      // Enable debug mode in development
      loaded: (posthog) => {
        //if (process.env.NODE_ENV === 'development') posthog.debug();
        // Manually capture initial pageview to ensure it's tracked
        posthog.capture('$pageview');
      },
    });
    console.log('POSTHOG_KEY', process.env.NEXT_PUBLIC_POSTHOG_KEY);
    console.log('POSTHOG_HOST', process.env.NEXT_PUBLIC_POSTHOG_HOST);
    const handleRouteChange = () => posthog?.capture('$pageview');

    Router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, []);

  // Handle user identification and tracking
  useEffect(() => {
    if (user?._id) {
      sendGTMEvent({
        'event': 'userId_set',
        'user_id': user?._id.toString()
      });

      console.log('IDENTIFYING USER WITH POSTHOG', user.name);
      // Identify user with PostHog
      posthog.identify(user._id.toString(), {
        name: user?.name,
        email: user?.email || '',
        roles: user?.roles,
        created_at: user?.ts ? new Date(user.ts * 1000).toISOString() : undefined,
        last_game: user?.lastGame,
        utm_source: user.utm_source,
        has_pro: isPro(user),
        email_confirmed: user.emailConfirmed,
        // Add other relevant user properties (be careful not to include sensitive data)
        // Don't include the entire user object for privacy reasons
      });
    } else {
      console.log('RESETING POSTHOG');
      // Reset PostHog identity when user logs out
      posthog.reset();
    }
  }, [user, user?._id, user?.name, user?.email, user?.roles, user?.ts, user?.lastGame, user?.utm_source, user?.emailConfirmed]);
}
