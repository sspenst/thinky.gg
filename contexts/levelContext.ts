import Level from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import World from '../models/db/world';
import { createContext } from 'react';

interface LevelContextInterface {
  getReviews: () => void;
  level: Level | undefined;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
  worlds: World[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
