import Stat from '../models/data/pathology/stat';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useStats() {
  const { data, error, isLoading, mutate } = useSWRHelper<Stat[]>(
    '/api/stats',
    { credentials: 'include' },
    { revalidateIfStale: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateStats: mutate,
    stats: data,
  };
}
