import Direction from '@root/constants/direction';
import Level from '@root/models/db/level';
import { createContext } from 'react';
import { KeyedMutator } from 'swr';

interface GameContextInterface {
  checkpoints?: (Direction[] | null)[];
  level: Level;
  mutateCheckpoints: KeyedMutator<(Direction[] | null)[]>;
}

export const GameContext = createContext<GameContextInterface>({
  level: {} as Level,
  mutateCheckpoints: {} as KeyedMutator<(Direction[] | null)[]>,
});
