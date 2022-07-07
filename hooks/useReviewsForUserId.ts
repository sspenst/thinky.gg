import Review from '../models/db/review';
import useSWRHelper from './useSWRHelper';

export default function useReviewsForUserId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Review[]>(
    id ? `/api/reviews-for-user-id/${id}` : null,
    undefined,
    { revalidateOnFocus: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateReviewsForUserId: mutate,
    reviewsForUserId: data,
  };
}
