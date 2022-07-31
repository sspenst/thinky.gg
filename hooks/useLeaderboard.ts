import { UserWithCount } from '../components/reviewerLeaderboardTable';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export default function useLeaderboard() {
  const { data, error, isLoading } = useSWRHelper<{topScorers:User[], topRecordBreakers:User[], topReviewers:UserWithCount[], currentlyOnlineCount:number, newUsers:User[]}>(
    '/api/leaderboard',
    undefined,
    undefined,
    { onValidation: true },
  );

  return {
    error,
    isLoading,
    topScorers: data?.topScorers,
    topRecordBreakers: data?.topRecordBreakers,
    topReviewers: data?.topReviewers,
    currentlyOnlineCount: data?.currentlyOnlineCount,
    newUsers: data?.newUsers,
  };
}
