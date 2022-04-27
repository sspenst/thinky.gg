import User from '../models/db/user';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useUserById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<User>(`/api/user-by-id/${id}`);

  return {
    error,
    isLoading,
    mutateUserById: mutate,
    user: data,
  };
}
