'use client';
import OpenReplay from '@openreplay/tracker';
import { AppContext } from '@root/contexts/appContext';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';

// Create a singleton tracker instance to persist across navigation
let globalTracker: OpenReplay | null = null;

// Cross-subdomain session management
const OPENREPLAY_SESSION_KEY = 'openreplay_session_hash';

const getSessionHashFromStorage = (): string | null => {
  try {
    return localStorage.getItem(OPENREPLAY_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to get session hash from localStorage:', error);

    return null;
  }
};

const saveSessionHashToStorage = (sessionHash: string): void => {
  try {
    localStorage.setItem(OPENREPLAY_SESSION_KEY, sessionHash);
  } catch (error) {
    console.warn('Failed to save session hash to localStorage:', error);
  }
};

const OpenReplayWrapper = () => {
  const { user } = useContext(AppContext);
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shouldReplaySession = window.localStorage.getItem('utm_source') !== null;

      if (shouldReplaySession && !globalTracker && !isInitialized) {
        let isMounted = true; // Prevent race conditions

        try {
          // Get existing session hash for cross-subdomain tracking
          const existingSessionHash = getSessionHashFromStorage();

          globalTracker = new OpenReplay({
            projectKey: 'GHKiOCFt7Tg49Fi2oyHM',
            // ingestPoint: 'https://your-domain.com/ingest', // Uncomment for self-hosted
            disableStringDict: true,
            capturePerformance: true,
            captureExceptions: true,
            __DISABLE_SECURE_MODE: true, // Enable for localhost/development testing
            // SPA-specific settings
            forceSingleTab: false, // Allow multi-tab recording
            autoResetOnWindowOpen: false, // Don't reset session on new tabs
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

          // Start with existing session hash if available (for cross-subdomain tracking)
          const startOptions = existingSessionHash ? { sessionHash: existingSessionHash } : undefined;

          globalTracker.start(startOptions)
            .then((sessionInfo: { sessionHash?: string; [key: string]: any }) => {
              // Only update state if component is still mounted
              if (isMounted) {
                // Save the session hash for cross-subdomain tracking
                if (sessionInfo?.sessionHash) {
                  saveSessionHashToStorage(sessionInfo.sessionHash);
                }

                setIsInitialized(true);
              }
            })
            .catch((error: unknown) => {
              if (isMounted) {
                console.error('Failed to start OpenReplay:', error);
                globalTracker = null;
              }
            });
        } catch (error: unknown) {
          if (isMounted) {
            console.error('Failed to initialize OpenReplay:', error);
            globalTracker = null;
          }
        }

        return () => {
          isMounted = false;
        };
      } else if (globalTracker && !isInitialized) {
        // Tracker already exists, just mark as initialized
        setIsInitialized(true);
      }
    }
  }, [isInitialized]);

  // Handle Next.js router events to ensure continuous tracking
  useEffect(() => {
    if (!globalTracker || !isInitialized) {
      return;
    }

    let listenersAttached = false;

    const handleRouteChangeStart = (url: string) => {
      try {
        // Send a custom event to mark page navigation
        globalTracker?.event('page_navigation_start', { url });
      } catch (error: unknown) {
        console.error('Failed to track route change start:', error);
      }
    };

    const handleRouteChangeComplete = (url: string) => {
      try {
        // Send a custom event to mark page navigation completion
        globalTracker?.event('page_navigation_complete', { url });

        // Verify tracker is still active after navigation
        if (globalTracker && !globalTracker.isActive()) {
          console.warn('OpenReplay tracker became inactive after navigation, restarting...');

          // Get the current session hash before restarting
          const currentSessionHash = getSessionHashFromStorage();
          const startOptions = currentSessionHash ? { sessionHash: currentSessionHash } : undefined;

          globalTracker.start(startOptions)
            .then((sessionInfo: { sessionHash?: string; [key: string]: any }) => {
              // Update session hash if it changed
              if (sessionInfo?.sessionHash) {
                saveSessionHashToStorage(sessionInfo.sessionHash);
              }
            })
            .catch((error: unknown) => {
              console.error('Failed to restart OpenReplay after navigation:', error);
            });
        }
      } catch (error: unknown) {
        console.error('Failed to track route change completion:', error);
      }
    };

    const handleRouteChangeError = (err: any, url: string) => {
      try {
        const errorMessage = err?.message || err?.toString() || 'Unknown navigation error';

        globalTracker?.event('page_navigation_error', {
          url,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      } catch (error: unknown) {
        console.error('Failed to track route change error:', error);
      }
    };

    if (!listenersAttached) {
      router.events.on('routeChangeStart', handleRouteChangeStart);
      router.events.on('routeChangeComplete', handleRouteChangeComplete);
      router.events.on('routeChangeError', handleRouteChangeError);
      listenersAttached = true;
    }

    return () => {
      if (listenersAttached) {
        router.events.off('routeChangeStart', handleRouteChangeStart);
        router.events.off('routeChangeComplete', handleRouteChangeComplete);
        router.events.off('routeChangeError', handleRouteChangeError);
      }
    };
  }, [router.events, isInitialized]);

  // Update user information when user changes
  useEffect(() => {
    if (globalTracker && isInitialized && user) {
      try {
        globalTracker.setUserID(user.name);
        globalTracker.setMetadata('_id', user._id.toString());
        globalTracker.setMetadata('email', user.email || '');
        // Add any other relevant user metadata
      } catch (error: unknown) {
        console.error('Failed to set user data in OpenReplay:', error);
      }
    }
  }, [isInitialized, user]);

  // Check if tracker is still active periodically
  useEffect(() => {
    if (!globalTracker || !isInitialized) return;

    const checkTrackerStatus = () => {
      try {
        if (globalTracker && !globalTracker.isActive()) {
          console.warn('OpenReplay tracker became inactive, attempting to restart...');

          // Get the current session hash before restarting
          const currentSessionHash = getSessionHashFromStorage();
          const startOptions = currentSessionHash ? { sessionHash: currentSessionHash } : undefined;

          globalTracker.start(startOptions)
            .then((sessionInfo: any) => {
              // Update session hash if it changed
              if (sessionInfo?.sessionHash) {
                saveSessionHashToStorage(sessionInfo.sessionHash);
              }
            })
            .catch((error: unknown) => {
              console.error('Failed to restart OpenReplay:', error);
            });
        }
      } catch (error: unknown) {
        console.error('Error checking tracker status:', error);
      }
    };

    const interval = setInterval(checkTrackerStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [isInitialized]);

  // Handle subdomain changes and session continuity
  useEffect(() => {
    if (!globalTracker || !isInitialized) return;

    const handleBeforeUnload = () => {
      try {
        // Get the current session hash before the page unloads
        if (globalTracker) {
          const sessionHash = globalTracker.stop();

          if (sessionHash) {
            saveSessionHashToStorage(sessionHash);
          }
        }
      } catch (error: unknown) {
        console.error('Failed to save session hash on page unload:', error);
      }
    };

    const handleVisibilityChange = () => {
      // When the page becomes visible again (e.g., switching back from another subdomain)
      if (document.visibilityState === 'visible' && globalTracker && !globalTracker.isActive()) {
        const currentSessionHash = getSessionHashFromStorage();
        const startOptions = currentSessionHash ? { sessionHash: currentSessionHash } : undefined;

        globalTracker.start(startOptions)
          .then((sessionInfo: any) => {
            if (sessionInfo?.sessionHash) {
              saveSessionHashToStorage(sessionInfo.sessionHash);
            }
          })
          .catch((error: unknown) => {
            console.error('Failed to restart OpenReplay on visibility change:', error);
          });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized]);

  return null;
};

export default OpenReplayWrapper;
