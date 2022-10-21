import { EnrichedLevel } from '../models/db/level';
import useSWRHelper from './useSWRHelper';

export default function useLastLevelPlayAttempt() {
  const { data, error, isLoading, mutate } = useSWRHelper<EnrichedLevel>(
    '/api/play-attempt?context=recent_unbeaten',
    { credentials: 'include' },
    { revalidateIfStale: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateLastLevelPlayed: mutate,
    lastLevelPlayed: data,
  };
}
