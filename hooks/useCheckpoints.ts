import { GameState } from '@root/components/level/game';
import { Types } from 'mongoose';
import useSWRHelper from './useSWRHelper';

export default function useCheckpoints(id: Types.ObjectId, disable: boolean) {
  const { data, error, isLoading, mutate } = useSWRHelper<(GameState | null)[]>(`/api/level/${id.toString()}/checkpoints`, {}, {}, disable);

  return {
    checkpoints: data,
    error,
    isLoading,
    mutateCheckpoints: mutate,
  };
}
