import Level from '../models/data/pathology/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevel(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level>(`/api/level/${id}`);

  return {
    error,
    isLoading,
    level: data,
    mutateLevel: mutate,
  };
}
