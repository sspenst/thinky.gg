import { createContext } from 'react';
import Collection from '../models/db/collection';
import Record from '../models/db/record';
import Review from '../models/db/review';
import { EnrichedLevelServer } from '../pages/search';

interface LevelContextInterface {
  collections: Collection[] | undefined;
  getReviews: () => void;
  level: EnrichedLevelServer | undefined;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
