import useSWRHelper from '../helpers/useSWRHelper';
import Level from '../models/db/level';

export default function useLevelsByUsernameAndSlug(username: string, slug: string) {
  const { data, error, isLoading, mutate } = useSWRHelper<Level[]>(`/api/levels-by-username-and-slug/${username}/${slug}`);

  return {
    error,
    isLoading,
    levels: data,
    mutateLevelsByUserNameAndSlug: mutate,
  };
}
