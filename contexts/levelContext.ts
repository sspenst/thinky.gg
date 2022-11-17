import { createContext } from 'react';
import Collection from '../models/db/collection';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import Stat from '../models/db/stat';

interface LevelContextInterface {
  collections: Collection[] | undefined;
  completions: Stat[] | undefined;
  getReviews: () => void;
  level: EnrichedLevel | undefined;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
