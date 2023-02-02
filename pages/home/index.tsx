import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React from 'react';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import useHomePageData from '../../hooks/useHomePageData';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';

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

  return {
    props: {
      // pass user here instead of using page context so that the page doesn't flash before retrieving user
      user: JSON.parse(JSON.stringify(reqUser)),
    } as { user: User },
  };
}

export interface HomepageDataProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel;
  recommendedEasyLevel?: EnrichedLevel;
  recommendedPendingLevel?: EnrichedLevel;
  topLevelsThisMonth?: EnrichedLevel[];

}

/* istanbul ignore next */
export default function App({
  user
}: {user: User}) {
  const { data } = useHomePageData();

  let lastLevelPlayed = undefined;
  let latestLevels = undefined;
  let latestReviews = undefined;
  let levelOfDay = undefined;
  let recommendedEasyLevel = undefined;
  let recommendedPendingLevel = undefined;
  let topLevelsThisMonth = undefined;

  if (data && data as HomepageDataProps) {
    lastLevelPlayed = data.lastLevelPlayed;
    latestLevels = data.latestLevels;
    latestReviews = data.latestReviews;
    levelOfDay = data.levelOfDay;
    recommendedEasyLevel = data.recommendedEasyLevel;
    recommendedPendingLevel = data.recommendedPendingLevel;
    topLevelsThisMonth = data.topLevelsThisMonth;
  }

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
