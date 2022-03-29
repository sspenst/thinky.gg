import User from '../models/data/pathology/user';
import useSWRHelper from './useSWRHelper';

export default function useLeaderboard() {
  const { data, error, isLoading } = useSWRHelper<User[]>('/api/leaderboard');

  return {
    error,
    isLoading,
    users: data,
  };
}
