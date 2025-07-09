import Direction from '@root/constants/direction';
import NProgress from 'nprogress';
import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { throttle } from 'throttle-debounce';

interface UseGameStatsProps {
  levelId: string;
  matchId?: string;
  disableStats?: boolean;
  disablePlayAttempts?: boolean;
  shouldAttemptAuth?: boolean;
  onStatsSuccess?: () => void;
  mutateUser?: () => void;
  mutateCheckpoints?: () => void;
  mutateCollection?: () => void;
  mutateLevel?: () => void;
  mutateProStatsLevel?: () => void;
  mutateReviews?: () => void;
}

interface UseGameStatsReturn {
  trackStats: (directions: Direction[], maxRetries?: number) => void;
  fetchPlayAttempt: () => void;
}

export default function useGameStats({
  levelId,
  matchId,
  disableStats = false,
  disablePlayAttempts = false,
  shouldAttemptAuth = false,
  onStatsSuccess,
  mutateUser,
  mutateCheckpoints,
  mutateCollection,
  mutateLevel,
  mutateProStatsLevel,
  mutateReviews,
}: UseGameStatsProps): UseGameStatsReturn {
  const lastDirections = useRef<Direction[]>([]);

  const trackStats = useCallback((directions: Direction[], maxRetries: number = 3) => {
    if (disableStats) {
      return;
    }

    // if directions array is identical to lastDirections array, don't PUT stats
    if (directions.length === lastDirections.current.length &&
        directions.every((direction, index) => direction === lastDirections.current[index])) {
      return;
    }

    NProgress.start();

    fetch('/api/stats', {
      method: 'PUT',
      body: JSON.stringify({
        directions: directions,
        levelId: levelId,
        matchId: matchId,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 200) {
        mutateUser?.();
        mutateCheckpoints?.();
        mutateCollection?.();
        mutateLevel?.();
        mutateProStatsLevel?.();
        mutateReviews?.();
        onStatsSuccess?.();
        lastDirections.current = directions;
      } else if (res.status === 500) {
        throw res.text();
      } else {
        // NB: don't retry if we get a 400 or 404 response since the request is already invalid
        const error = JSON.parse(await res.text())?.error;

        toast.dismiss();
        toast.error(`Error updating stats: ${error}`, { duration: 3000 });
      }
    }).catch(async err => {
      const error = JSON.parse(await err)?.error;

      console.error(`Error updating stats: { directions: ${directions}, levelId: ${levelId} }`, error);
      toast.dismiss();
      toast.error(`Error updating stats: ${error}`, { duration: 3000 });

      if (maxRetries > 0) {
        trackStats(directions, maxRetries - 1);
      }
    }).finally(() => {
      NProgress.done();
    });
  }, [
    disableStats,
    levelId,
    matchId,
    mutateUser,
    mutateCheckpoints,
    mutateCollection,
    mutateLevel,
    mutateProStatsLevel,
    mutateReviews,
    onStatsSuccess
  ]);

  const SECOND = 1000;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPlayAttempt = useCallback(throttle(15 * SECOND, async () => {
    if (disablePlayAttempts || !shouldAttemptAuth) {
      return;
    }

    try {
      await fetch('/api/play-attempt', {
        body: JSON.stringify({
          levelId: levelId,
          matchId: matchId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } catch (error) {
      console.error('Error tracking play attempt:', error);
    }
  }), [disablePlayAttempts, shouldAttemptAuth, levelId, matchId]);

  return {
    trackStats,
    fetchPlayAttempt,
  };
}
