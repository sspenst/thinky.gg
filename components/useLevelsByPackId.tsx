import Level from '../models/data/pathology/level';
import useSWRDynamicHelper from './useSWRDynamicHelper';

export default function useLevelsByPackId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRDynamicHelper<Level[]>(`/api/levelsByPackId/${id}`);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByPackId: mutate,
  };
}
