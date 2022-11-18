import MultiplayerMatch from '../models/db/multiplayerMatch';
import useSWRHelper from './useSWRHelper';

export default function useMatches() {
  const { data, error, isLoading, mutate } = useSWRHelper<MultiplayerMatch[]>(
    '/api/match',
    { credentials: 'include' },
    { revalidateIfStale: false,
      refreshInterval: 2000
    },
    { onValidation: false },

  );

  return {
    error,
    isLoading,
    mutateMatches: mutate,
    matches: data,
  };
}
