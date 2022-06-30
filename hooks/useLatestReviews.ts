import Review from '../models/db/review';
import useSWRHelper from './useSWRHelper';

export default function useLatestReviews() {
  const { data, error, isLoading } = useSWRHelper<Review[]>('/api/latest-reviews');

  return {
    error,
    isLoading,
    reviews: data,
  };
}
