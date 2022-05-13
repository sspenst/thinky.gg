import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLatestLevels() {
  const { data, error, isLoading } = useSWRHelper<Level[]>('/api/latest-levels');

  return {
    error,
    isLoading,
    levels: data,
  };
}
