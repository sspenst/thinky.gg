import { CheckpointState } from '@root/helpers/checkpointHelpers';
import { createContext } from 'react';

interface GameContextInterface {
  checkpoints?: (CheckpointState | null)[];
  deleteCheckpoint: (slot: number) => void;
  loadCheckpoint: (slot: number) => void;
  saveCheckpoint: (slot: number) => void;
}

export const GameContext = createContext<GameContextInterface>({
  deleteCheckpoint: () => { return; },
  loadCheckpoint: () => { return; },
  saveCheckpoint: () => { return; },
});
