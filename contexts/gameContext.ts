import { GameState } from '@root/components/level/game';
import { createContext } from 'react';

interface GameContextInterface {
  checkpoints?: (GameState | null)[];
  deleteCheckpoint: (slot: number) => void;
  loadCheckpoint: (slot: number) => void;
  saveCheckpoint: (slot: number) => void;
}

export const GameContext = createContext<GameContextInterface>({
  deleteCheckpoint: () => { return; },
  loadCheckpoint: () => { return; },
  saveCheckpoint: () => { return; },
});
