import Level from '../models/db/level';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useLevelsByUsernameAndSlug(username: string, slug: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(`/api/level/${username}/${slug}`);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByUserNameAndSlug: mutate,
  };
}
