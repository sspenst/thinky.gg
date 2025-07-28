import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '@root/contexts/appContext';

interface EngagementMetrics {
  sessionStartTime: number;
  currentSessionDuration: number;
  levelStartTime?: number;
  levelDuration?: number;
  actionsPerformed: number;
  scrollDepth: number;
  isPlaying: boolean;
  hasInteracted: boolean;
}

interface GameplayEvent {
  type: 'level_start' | 'level_complete' | 'level_restart' | 'hint_used' | 'pause' | 'resume';
  timestamp: number;
  metadata?: Record<string, any>;
}

export const useGamingEngagement = () => {
  const { game, user } = useContext(AppContext);
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    sessionStartTime: Date.now(),
    currentSessionDuration: 0,
    actionsPerformed: 0,
    scrollDepth: 0,
    isPlaying: false,
    hasInteracted: false,
  });

  const sessionTimerRef = useRef<NodeJS.Timeout>();
  const engagementTimerRef = useRef<NodeJS.Timeout>();
  const events = useRef<GameplayEvent[]>([]);

  // Track session duration
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        currentSessionDuration: Date.now() - prev.sessionStartTime,
      }));
    }, 1000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  // Track scroll depth for dwell time optimization
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollDepth = scrollHeight > 0 ? Math.round((scrolled / scrollHeight) * 100) : 0;

      setMetrics(prev => ({
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth, scrollDepth),
        hasInteracted: true,
      }));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track user interactions for engagement signals
  useEffect(() => {
    const trackInteraction = () => {
      setMetrics(prev => ({
        ...prev,
        actionsPerformed: prev.actionsPerformed + 1,
        hasInteracted: true,
      }));
    };

    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, trackInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackInteraction);
      });
    };
  }, []);

  const trackGameplayEvent = (event: Omit<GameplayEvent, 'timestamp'>) => {
    const gameplayEvent: GameplayEvent = {
      ...event,
      timestamp: Date.now(),
    };

    events.current.push(gameplayEvent);

    // Update metrics based on event type
    switch (event.type) {
      case 'level_start':
        setMetrics(prev => ({
          ...prev,
          levelStartTime: Date.now(),
          isPlaying: true,
        }));
        break;
      case 'level_complete':
      case 'level_restart':
        setMetrics(prev => ({
          ...prev,
          levelDuration: prev.levelStartTime ? Date.now() - prev.levelStartTime : undefined,
          isPlaying: event.type === 'level_restart',
        }));
        break;
      case 'pause':
        setMetrics(prev => ({ ...prev, isPlaying: false }));
        break;
      case 'resume':
        setMetrics(prev => ({ ...prev, isPlaying: true }));
        break;
    }

    // Send to analytics (implement your analytics service)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.type, {
        event_category: 'Gaming Engagement',
        event_label: game?.id || 'unknown',
        value: event.metadata?.score || 1,
        custom_map: {
          dimension1: user?.id || 'anonymous',
          dimension2: game?.id || 'unknown',
        },
      });
    }
  };

  const getEngagementScore = (): number => {
    const {
      currentSessionDuration,
      actionsPerformed,
      scrollDepth,
      hasInteracted,
      isPlaying,
    } = metrics;

    let score = 0;

    // Session duration (max 40 points)
    score += Math.min(currentSessionDuration / 1000 / 60 * 10, 40); // 10 points per minute

    // Interactions (max 30 points)
    score += Math.min(actionsPerformed * 2, 30);

    // Scroll engagement (max 20 points)
    score += (scrollDepth / 100) * 20;

    // Bonuses
    if (hasInteracted) score += 5;
    if (isPlaying) score += 5;

    return Math.round(score);
  };

  const sendEngagementReport = () => {
    const report = {
      ...metrics,
      engagementScore: getEngagementScore(),
      events: events.current.slice(-10), // Last 10 events
      gameId: game?.id,
      userId: user?.id,
      timestamp: Date.now(),
    };

    // Send to your analytics endpoint
    if (typeof window !== 'undefined') {
      // Example: Send to Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('event', 'engagement_report', {
          event_category: 'User Engagement',
          event_label: game?.id || 'unknown',
          value: report.engagementScore,
          custom_map: {
            dimension1: report.userId || 'anonymous',
            dimension2: report.gameId || 'unknown',
            dimension3: report.currentSessionDuration.toString(),
          },
        });
      }
    }

    return report;
  };

  // Send engagement report before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendEngagementReport();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [metrics, game, user]);

  return {
    metrics,
    trackGameplayEvent,
    getEngagementScore,
    sendEngagementReport,
  };
};