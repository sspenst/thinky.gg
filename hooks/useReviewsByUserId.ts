import Review from '../models/db/review';
import useSWRHelper from '../helpers/useSWRHelper';

export default function useReviewsByUserId(id: string | string[] | undefined) {
  const { data, error, isLoading, mutate } = useSWRHelper<Review[]>(`/api/reviewsByUserId/${id}`);

  return {
    error,
    isLoading,
    mutateReviewsByUserId: mutate,
    reviews: data,
  };
}
