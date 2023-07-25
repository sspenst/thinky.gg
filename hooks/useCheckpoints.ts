import Direction from '@root/constants/direction';
import { CheckpointState } from '@root/helpers/checkpointHelpers';
import { Types } from 'mongoose';
import useSWRHelper from './useSWRHelper';

export const BEST_CHECKPOINT_INDEX = 10;

export default function useCheckpoints(id: Types.ObjectId, disable: boolean) {
  const { data, error, isLoading, mutate } = useSWRHelper<(CheckpointState | Direction[] | null)[]>(`/api/level/${id.toString()}/checkpoints`, {}, {}, disable);

  return {
    checkpoints: data,
    error,
    isLoading,
    mutateCheckpoints: mutate,
  };
}
