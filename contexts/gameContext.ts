import { GameState } from '@root/components/level/game';
import { createContext } from 'react';

interface GameContextInterface {
  checkpoints?: (GameState | null)[];
  loadCheckpoint: (slot: number) => void;
  saveCheckpoint: (slot: number) => void;
}

export const GameContext = createContext<GameContextInterface>({
  loadCheckpoint: () => { return; },
  saveCheckpoint: () => { return; },
});
