import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import ContinuePlaying from '../../components/continuePlaying';
import HomeLoggedIn from '../../components/homeLoggedIn';
import HomeVideo from '../../components/homeVideo';
import LevelOfTheDay from '../../components/levelOfTheDay';
import Page from '../../components/page';
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
        destination: '/',
        permanent: false,
      },
    };
  }

  const [lastLevelPlayed, levelOfDay, levels, reviews] = await Promise.all([
    getLastLevelPlayed(reqUser),
    getLevelOfDay(reqUser),
    getLatestLevels(reqUser),
    getLatestReviews(reqUser),
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
        <HomeVideo />
        <div className='flex flex-wrap justify-center m-4 gap-4'>
          {levelOfDay && <LevelOfTheDay level={levelOfDay} />}
          {lastLevelPlayed && (
            <ContinuePlaying level={lastLevelPlayed} />
          )}
        </div>
        <HomeLoggedIn levels={levels} reviews={reviews} />
      </>
    </Page>
  );
}
