import { Types } from 'mongoose';
import { CommentQuery } from '../pages/api/comment/[id]';
import useSWRHelper from './useSWRHelper';

export default function useComments(userId: Types.ObjectId) {
  const { data, error, isLoading, mutate } = useSWRHelper<CommentQuery>(
    '/api/comment/get?id=' + userId.toString(),
    undefined,
    { revalidateIfStale: false, revalidateOnFocus: false },
  );

  return {
    commentQuery: data,
    error,
    isLoading,
    mutateComments: mutate,
  };
}
