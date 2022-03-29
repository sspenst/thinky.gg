import Level from '../models/data/pathology/level';
import useSWRHelper from './useSWRHelper';

export default function useLevelsByPackId(id: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(
    `/api/levelsByPackId/${id}`, undefined, undefined, false
  );

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByPackId: mutate,
  };
}
