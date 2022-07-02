import UserConfig from '../models/db/userConfig';
import useSWRHelper from './useSWRHelper';

export default function useUserConfig() {
  const { data, error, isLoading, mutate } = useSWRHelper<UserConfig>(
    '/api/user-config',
    { credentials: 'include' },
    { revalidateIfStale: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateUserConfig: mutate,
    userConfig: data,
  };
}
