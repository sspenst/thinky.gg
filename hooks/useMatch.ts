import MultiplayerMatch from '../models/db/multiplayerMatch';
import useSWRHelper from './useSWRHelper';

export default function useMatch(matchId: string, poll: boolean) {
  const { data, error, isLoading, mutate } = useSWRHelper<MultiplayerMatch>(
    '/api/match/' + matchId,
    { credentials: 'include' },
    { revalidateIfStale: false,
      refreshInterval: 1000,
      isPaused: () => !poll,
    },
    { onValidation: false },

  );

  return {
    error,
    isLoading,
    mutateMatch: mutate,
    match: data,
  };
}
