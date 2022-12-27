import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import TimeRange from '../../constants/timeRange';
import { getUserFromToken } from '../../lib/withAuth';
import Level, { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import { getLatestLevels } from '.././api/latest-levels';
import { getLatestReviews } from '.././api/latest-reviews';
import { getLevelOfDay } from '.././api/level-of-day';
import { getLastLevelPlayed } from '../api/play-attempt';
import { doQuery, SearchResult } from '../api/search';
import { SearchQuery } from '../search';

async function getTopLevelsOfLast30d(reqUser: User) {
  const query = {
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Month],
    num_results: '5',
  } as SearchQuery;

  return await doQuery(query, reqUser._id);
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

  const [lastLevelPlayed, levelOfDay, levels, reviews, topLevelsOfLast30d] = await Promise.all([
    getLastLevelPlayed(reqUser),
    getLevelOfDay(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
    getTopLevelsOfLast30d(reqUser)
  ]);

  return {
    props: {
      lastLevelPlayed: JSON.parse(JSON.stringify(lastLevelPlayed)),
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
      topLevelsOfLast30d: JSON.parse(JSON.stringify(topLevelsOfLast30d)),
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
  topLevelsOfLast30d: SearchResult;
  user: User;

}

/* istanbul ignore next */
export default function App({ lastLevelPlayed, levels, levelOfDay, reviews, topLevelsOfLast30d, user }: AppSWRProps) {
  return (
    <Page title={'Pathology'}>
      <HomeLoggedIn
        lastLevelPlayed={lastLevelPlayed}
        levelOfDay={levelOfDay}
        levels={levels}
        reviews={reviews}
        topLevelsOfLast30d={topLevelsOfLast30d.levels}
        user={user}

      />
    </Page>
  );
}
