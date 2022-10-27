import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import { SWRConfig } from 'swr';
import Home from '../../components/home';
import HomeDefault from '../../components/homeDefault';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import getSWRKey from '../../helpers/getSWRKey';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Level, { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import { getLatestLevels } from '.././api/latest-levels';
import { getLatestReviews } from '.././api/latest-reviews';
import { getLevelOfDay } from '.././api/level-of-day';
import { getLastLevelPlayed } from '../api/play-attempt';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // NB: connect early to avoid parallel connections below
  await dbConnect();

  const [levelOfDay, levels, reviews, lastLevelPlayed] = await Promise.all([
    getLevelOfDay(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
    getLastLevelPlayed(reqUser)
  ]);

  return {
    props: {
      lastLevelPlayed: JSON.parse(JSON.stringify(lastLevelPlayed)),
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    } as AppSWRProps,
  };
}

interface AppSWRProps {
  lastLevelPlayed?: EnrichedLevel;
  levelOfDay: EnrichedLevel;
  levels: Level[];
  reviews: Review[];
}

/* istanbul ignore next */
export default function App({ lastLevelPlayed, levels, levelOfDay, reviews }: AppSWRProps) {
  return (
    <Page title={'Pathology'}>
      <>
        <Home levelOfDay={levelOfDay} lastLevelPlayed={lastLevelPlayed} />
        <HomeLoggedIn levels={levels} reviews={reviews} />
      </>
    </Page>
  );
}
