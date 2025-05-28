'use client';
import OpenReplay from '@openreplay/tracker';
import { AppContext } from '@root/contexts/appContext';
import { useContext, useEffect, useState } from 'react';

const OpenReplayWrapper = () => {
  const { user } = useContext(AppContext);
  const [tracker, setTracker] = useState<OpenReplay | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldReplaySession = window.localStorage.getItem('utm_source') !== null;

      if (shouldReplaySession && !tracker) {
        try {
          const trackerInstance = new OpenReplay({
            projectKey: 'GHKiOCFt7Tg49Fi2oyHM',
            // ingestPoint: 'https://your-domain.com/ingest', // Uncomment for self-hosted
            disableStringDict: true,
            capturePerformance: true,
            captureExceptions: true,
            __DISABLE_SECURE_MODE: false, // Set to true only for local development
            network: {
              capturePayload: true,
              failuresOnly: false,
              ignoreHeaders: ['Cookie', 'Set-Cookie', 'Authorization'],
              sessionTokenHeader: false,
              captureInIframes: false,
            },
            defaultInputMode: 2, // 0: plain, 1: obscured, 2: ignored
            // Console settings
            consoleMethods: ['log', 'info', 'warn', 'error', 'debug'],
            consoleThrottling: 30,
          });

          console.log('Initializing OpenReplay');

          trackerInstance.start()
            .then((sessionInfo: any) => {
              console.log('OpenReplay started successfully', sessionInfo);
              setTracker(trackerInstance);
            })
            .catch((error: any) => {
              console.error('Failed to start OpenReplay:', error);
            });
        } catch (error: any) {
          console.error('Failed to initialize OpenReplay:', error);
        }
      }
    }
  }, [tracker]);

  // Update user information when user changes
  useEffect(() => {
    if (tracker && user) {
      try {
        tracker.setUserID(user.name);
        tracker.setMetadata('_id', user._id.toString());
        tracker.setMetadata('email', user.email || '');
        // Add any other relevant user metadata
      } catch (error: any) {
        console.error('Failed to set user data in OpenReplay:', error);
      }
    }
  }, [tracker, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tracker) {
        try {
          tracker.stop();
        } catch (error: any) {
          console.error('Failed to stop OpenReplay:', error);
        }
      }
    };
  }, [tracker]);

  return null;
};

export default OpenReplayWrapper;
