import { ObjectId } from 'bson';
import Comment from '../models/db/comment';
import useSWRHelper from './useSWRHelper';

export default function useComments(userId: ObjectId) {
  const { data, error, isLoading, mutate } = useSWRHelper<Comment[]>(
    '/api/comment/' + userId.toString(),
    { credentials: 'include' },
    { revalidateIfStale: false },
    { onValidation: false },
  );

  return {
    error,
    isLoading,
    mutateComments: mutate,
    comments: data,
  };
}
