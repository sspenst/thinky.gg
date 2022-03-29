import Level from '../models/data/pathology/level';
import useSWRDynamicHelper from './useSWRDynamicHelper';

export default function useLevel(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRDynamicHelper<Level>(`/api/level/${id}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
