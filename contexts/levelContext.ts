import { createContext } from 'react';
import { KeyedMutator } from 'swr';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import Review from '../models/db/review';
import Stat from '../models/db/stat';

interface LevelContextInterface {
  completions: Stat[] | undefined;
  getCompletions: (all: boolean) => void;
  getReviews: () => void;
  inCampaign: boolean; // true means you are playing an unbeaten level in the campaign
  level: EnrichedLevel | undefined;
  mutateLevel: KeyedMutator<EnrichedLevel>;
  records: Record[] | undefined;
  reviews: Review[] | undefined;
}

export const LevelContext = createContext<LevelContextInterface | null>(null);
