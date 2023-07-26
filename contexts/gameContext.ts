import Direction from '@root/constants/direction';
import { CheckpointState } from '@root/helpers/checkpointHelpers';
import Level from '@root/models/db/level';
import { createContext } from 'react';

interface GameContextInterface {
  checkpoints?: (CheckpointState | Direction[] | null)[];
  deleteCheckpoint: (slot: number) => void;
  level: Level;
  loadCheckpoint: (slot: number) => void;
  saveCheckpoint: (slot: number) => void;
}

export const GameContext = createContext<GameContextInterface>({
  deleteCheckpoint: () => { return; },
  level: {} as Level,
  loadCheckpoint: () => { return; },
  saveCheckpoint: () => { return; },
});
