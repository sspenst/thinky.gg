import { createContext } from 'react';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import Stat from '../models/db/stat';

interface LevelContextInterface {
  completions: Stat[] | undefined;
  getCompletions: (all: boolean) => void;
  getReviews: () => void;
  hideReviews: boolean;
  level: EnrichedLevel | undefined;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
