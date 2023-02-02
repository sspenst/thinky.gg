import { HomepageDataProps } from '../pages/home';
import useSWRHelper from './useSWRHelper';

export enum HomepageDataType {
  LastLevelPlayed = 'lastLevelPlayed',
  LatestLevels = 'latestLevels',
  LatestReviews = 'latestReviews',
  LevelOfDay = 'levelOfDay',
  RecommendedEasyLevel = 'recommendedEasyLevel',
  RecommendedPendingLevel = 'recommendedPendingLevel',
  TopLevelsThisMonth = 'topLevelsThisMonth'
}

export default function useHomePageData(types: HomepageDataType[] = []) {
  // convert to query string where each key is the type and the value is 1
  const qstring = types.map(type => `${type}=1`).join('&');
  const { data, error, isLoading } = useSWRHelper<HomepageDataProps>('/api/home?' + qstring, undefined, {
    revalidateIfStale: false,
    revalidateOnFocus: false
  });

  return {
    error,
    isLoading,
    data: data
  };
}
