import Level from '../models/data/pathology/level';
import useSWRHelper from './useSWRHelper';

export default function useLevel(id: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level>(
    `/api/level/${id}`, undefined, undefined, false
  );

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
