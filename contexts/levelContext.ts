import Collection from '../models/db/collection';
import Level from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import { createContext } from 'react';

interface LevelContextInterface {
  collections: Collection[] | undefined;
  getReviews: () => void;
  level: Level | undefined;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
