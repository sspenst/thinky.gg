import Direction from '@root/constants/direction';
import { CheckpointState } from '@root/helpers/checkpointHelpers';
import Level from '@root/models/db/level';
import { createContext } from 'react';

interface GameContextInterface {
  checkpoints?: (CheckpointState | Direction[] | null)[];
  deleteCheckpoint: (index: number) => void;
  level: Level;
  loadCheckpoint: (index: number) => void;
  saveCheckpoint: (index: number) => void;
}

export const GameContext = createContext<GameContextInterface>({
  deleteCheckpoint: () => { return; },
  level: {} as Level,
  loadCheckpoint: () => { return; },
  saveCheckpoint: () => { return; },
});
