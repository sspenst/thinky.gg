import { HomepageDataProps } from '../pages/[subdomain]';
import useSWRHelper from './useSWRHelper';

export enum HomepageDataType {
  LastLevelPlayed = 'lastLevelPlayed',
  LatestLevels = 'latestLevels',
  LatestReviews = 'latestReviews',
  LevelOfDay = 'levelOfDay',
  RecommendedLevel = 'recommendedLevel',
  TopLevelsThisMonth = 'topLevelsThisMonth'
}

export default function useHomePageData(types: HomepageDataType[] = [], disable = false) {
  // convert to query string where each key is the type and the value is 1
  const qstring = types.map(type => `${type}=1`).join('&');
  const { data, error, isLoading, mutate } = useSWRHelper<HomepageDataProps>(
    '/api/home?' + qstring,
    {},
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      keepPreviousData: false,
      fallback: {},
      fallbackData: {},
    },
    disable,
  );

  return {
    data: data,
    error,
    isLoading,
    mutate: mutate,
  };
}
