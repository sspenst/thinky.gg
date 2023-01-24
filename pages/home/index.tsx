import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import TimeRange from '../../constants/timeRange';
import { FilterSelectOption } from '../../helpers/filterSelectOptions';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';
import { LEVEL_SEARCH_DEFAULT_PROJECTION } from '../../models/schemas/levelSchema';
import { getLatestLevels } from '.././api/latest-levels';
import { getLatestReviews } from '.././api/latest-reviews';
import { getLevelOfDay } from '.././api/level-of-day';
import { getLastLevelPlayed } from '../api/play-attempt';
import { doQuery } from '../api/search';
import { SearchQuery } from '../search';

async function getTopLevelsThisMonth(reqUser: User) {
  const query = {
    num_results: '6',
    sort_by: 'reviews_score',
    time_range: TimeRange[TimeRange.Month],
  } as SearchQuery;

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });

  return result?.levels;
}

async function getRecommendedEasyLevel(reqUser: User) {
  const query = {
    min_steps: '7',
    max_steps: '2500',
    min_rating: '0.55',
    max_rating: '1',
    num_results: '10', // randomly select one of these
    show_filter: FilterSelectOption.HideWon,
    sort_by: 'calc_difficulty_estimate',
    sort_dir: 'asc',
    time_range: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
}

async function getRecommendedPendingLevel(reqUser: User) {
  const query = {
    difficulty_filter: 'Pending',
    num_results: '10', // randomly select one of these
    show_filter: FilterSelectOption.ShowUnattempted,
    sort_by: 'players_beaten',
    time_range: TimeRange[TimeRange.All],
  } as SearchQuery;

  const result = await doQuery(query, reqUser._id, { ...LEVEL_SEARCH_DEFAULT_PROJECTION, data: 1, height: 1, width: 1 });
  const levels = result?.levels;

  if (!levels || levels.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * levels.length);

  return levels[randomIndex];
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

  const [
    lastLevelPlayed,
    latestLevels,
    latestReviews,
    levelOfDay,
    recommendedEasyLevel,
    recommendedPendingLevel,
    topLevelsThisMonth
  ] = await Promise.all([
    getLastLevelPlayed(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
    getLevelOfDay(reqUser),
    getRecommendedEasyLevel(reqUser),
    getRecommendedPendingLevel(reqUser),
    getTopLevelsThisMonth(reqUser),
  ]);

  return {
    props: {
      lastLevelPlayed: JSON.parse(JSON.stringify(lastLevelPlayed)),
      latestLevels: JSON.parse(JSON.stringify(latestLevels)),
      latestReviews: JSON.parse(JSON.stringify(latestReviews)),
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      recommendedEasyLevel: JSON.parse(JSON.stringify(recommendedEasyLevel)),
      recommendedPendingLevel: JSON.parse(JSON.stringify(recommendedPendingLevel)),
      topLevelsThisMonth: JSON.parse(JSON.stringify(topLevelsThisMonth)),
      // pass user here instead of using page context so that the page doesn't flash before retrieving user
      user: JSON.parse(JSON.stringify(reqUser)),
    } as AppSWRProps,
  };
}

interface AppSWRProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel;
  recommendedEasyLevel?: EnrichedLevel;
  recommendedPendingLevel?: EnrichedLevel;
  topLevelsThisMonth?: EnrichedLevel[];
  user: User;
}

/* istanbul ignore next */
export default function App({
  lastLevelPlayed,
  latestLevels,
  latestReviews,
  levelOfDay,
  recommendedEasyLevel,
  recommendedPendingLevel,
  topLevelsThisMonth,
  user
}: AppSWRProps) {
  return (
    <Page title={'Pathology'}>
      <HomeLoggedIn
        lastLevelPlayed={lastLevelPlayed}
        latestLevels={latestLevels}
        latestReviews={latestReviews}
        levelOfDay={levelOfDay}
        recommendedEasyLevel={recommendedEasyLevel}
        recommendedPendingLevel={recommendedPendingLevel}
        topLevelsThisMonth={topLevelsThisMonth}
        user={user}
      />
    </Page>
  );
}
