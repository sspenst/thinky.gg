import { EnrichedLevel } from '../models/db/level';
import { HomepageDataProps } from '../pages/home';
import useSWRHelper from './useSWRHelper';

export default function useHomePageData() {
  const { data, error, isLoading } = useSWRHelper<HomepageDataProps>('/api/home');

  return {
    error,
    isLoading,
    data: data
  };
}
