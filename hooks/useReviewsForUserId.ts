import Review from '../models/db/review';
import useSWRHelper from './useSWRHelper';

export default function useReviewsForUserId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Review[]>(id ? `/api/reviews-for-user-id/${id}` : null);

  return {
    error,
    isLoading,
    mutateReviewsByUserId: mutate,
    reviews_for_user_id: data,
  };
}
