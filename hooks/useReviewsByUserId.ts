import Review from '../models/db/review';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useReviewsByUserId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Review[]>(id ? `/api/reviews-by-user-id/${id}` : null);

  return {
    error,
    isLoading,
    mutateReviewsByUserId: mutate,
    reviews: data,
  };
}
