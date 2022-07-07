import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useUserById(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<User>(
    id ? `/api/user-by-id/${id}` : null,
    undefined,
    { revalidateOnFocus: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateUserById: mutate,
    user: data,
  };
}
