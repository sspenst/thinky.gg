import Stat from '../models/data/pathology/stat';
import useSWRHelper from './useSWRHelper';

export default function useStats() {
  const { data, error, isLoading, mutate } = useSWRHelper<Stat[]>(
    '/api/stats',
    { credentials: 'include' },
    { revalidateIfStale: false }
  );

  return {
    error,
    isLoading,
    mutateStats: mutate,
    stats: data,
  };
}
