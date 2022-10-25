import React from 'react';
import { SWRConfig } from 'swr';
import Home from '../components/home';
import Page from '../components/page';
import getSWRKey from '../helpers/getSWRKey';
import dbConnect from '../lib/dbConnect';
import Level, { EnrichedLevel } from '../models/db/level';
import Review from '../models/db/review';
import { getLatestLevels } from './api/latest-levels';
import { getLatestReviews } from './api/latest-reviews';
import { getLevelOfDay } from './api/level-of-day';

export async function getStaticProps() {
  // NB: connect early to avoid parallel connections below
  await dbConnect();

  const [levelOfDay, levels, reviews] = await Promise.all([
    getLevelOfDay(),
    getLatestLevels(),
    getLatestReviews(),
  ]);

  return {
    props: {
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    } as AppSWRProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levelOfDay: EnrichedLevel;
  levels: Level[];
  reviews: Review[];
}

/* istanbul ignore next */
export default function AppSWR({ levelOfDay, levels, reviews }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/level-of-day')]: levelOfDay,
      [getSWRKey('/api/latest-levels')]: levels,
      [getSWRKey('/api/latest-reviews')]: reviews,
    } }}>
      <App />
    </SWRConfig>
  );
}

/* istanbul ignore next */
function App() {
  return (
    <Page title={'Pathology'}>
      <Home />
    </Page>
  );
}
