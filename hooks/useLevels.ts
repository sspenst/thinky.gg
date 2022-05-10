import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevels() {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>('/api/levels');

  return {
    error,
    isLoading,
    levels: data,
    mutateLevels: mutate,
  };
}
