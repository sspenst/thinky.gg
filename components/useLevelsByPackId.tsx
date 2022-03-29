import Level from '../models/data/pathology/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelsByPackId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(`/api/levelsByPackId/${id}`);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByPackId: mutate,
  };
}
