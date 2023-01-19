import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import TimeRange from '../../constants/timeRange';
import { getUserFromToken } from '../../lib/withAuth';
import Level, { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../models/schemas/levelSchema';
import { getLatestLevels } from '.././api/latest-levels';
import { getLatestReviews } from '.././api/latest-reviews';
import { getLevelOfDay } from '.././api/level-of-day';
import { getLastLevelPlayed } from '../api/play-attempt';
import { doQuery, SearchResult } from '../api/search';
import { SearchQuery } from '../search';

async function getTopLevelsThisMonth(reqUser: User) {
  const query = {
    num_results: '6',
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Month],
  } as SearchQuery;

  return await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const [lastLevelPlayed, levelOfDay, levels, reviews, topLevelsThisMonth] = await Promise.all([
    getLastLevelPlayed(reqUser),
    getLevelOfDay(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
    getTopLevelsThisMonth(reqUser),
  ]);

  return {
    props: {
      lastLevelPlayed: JSON.parse(JSON.stringify(lastLevelPlayed)),
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
      topLevelsThisMonth: JSON.parse(JSON.stringify(topLevelsThisMonth)),
      // pass user here instead of using page context so that the page doesn't flash before retrieving user
      user: JSON.parse(JSON.stringify(reqUser)),
    } as AppSWRProps,
  };
}

interface AppSWRProps {
  lastLevelPlayed?: EnrichedLevel;
  levelOfDay: EnrichedLevel;
  levels: Level[];
  reviews: Review[];
  topLevelsThisMonth: SearchResult;
  user: User;

}

/* istanbul ignore next */
export default function App({ lastLevelPlayed, levels, levelOfDay, reviews, topLevelsThisMonth, user }: AppSWRProps) {
  return (
    <Page title={'Pathology'}>
      <HomeLoggedIn
        lastLevelPlayed={lastLevelPlayed}
        levelOfDay={levelOfDay}
        levels={levels}
        reviews={reviews}
        topLevelsThisMonth={topLevelsThisMonth.levels}
        user={user}
      />
    </Page>
  );
}
