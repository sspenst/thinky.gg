import { DateAndSum, ProStatsLevel as ProStatsLevel } from '../contexts/levelContext';
import { EnrichedLevel } from '../models/db/level';
import User from '../models/db/user';
import useSWRHelper from './useSWRHelper';

export enum ProStatsUserType {
  ScoreHistory = 'score-history',
}

export interface ProStatsUser {
  // keyValues is an array of objects
  [ProStatsUserType.ScoreHistory]?: DateAndSum[];
}

export default function useProStatsUser(user: User | null, type: ProStatsUserType) {
  console.log(user === undefined);
  const { data, error, isLoading, mutate } = useSWRHelper<ProStatsUser>('/api/user/' + user?._id + '/prostats/' + type, {}, {}, !user);

  return {
    error,
    isLoading,
    data: data,
    mutateProStats: mutate,
  };
}
