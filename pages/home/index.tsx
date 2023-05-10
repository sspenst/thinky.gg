import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import HomeLoggedIn from '../../components/homeLoggedIn';
import Page from '../../components/page';
import useHomePageData, { HomepageDataType } from '../../hooks/useHomePageData';
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
    } as HomeProps,
  };
}

export interface HomepageDataProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel;
  recommendedLevel?: EnrichedLevel;
  recommendedUnattemptedLevel?: EnrichedLevel;
  topLevelsThisMonth?: EnrichedLevel[];
}

interface HomeProps {
  user: User;
}

export function isVisibleInDom(id: string) {
  const element = document.getElementById(id);

  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);

  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

/* istanbul ignore next */
export default function Home({ user }: HomeProps) {
  const [loadLastLevelPlayed, setLoadLastLevelPlayed] = useState(false);
  const [loadLatestLevels, setLoadLatestLevels] = useState(false);
  const [loadLatestReviews, setLoadLatestReviews] = useState(false);
  const [loadLevelOfDay, setLoadLevelOfDay] = useState(false);
  const [loadRecommendedLevel, setLoadRecommendedLevel] = useState(false);
  const [loadRecommendedUnattemptedLevel, setLoadRecommendedUnattemptedLevel] = useState(false);
  const [loadTopLevelsThisMonth, setLoadTopLevelsThisMonth] = useState(false);

  useEffect(() => {
    const checkDomVisibility = () => {
      if (isVisibleInDom('last-level-played')) {
        setLoadLastLevelPlayed(true);
      }

      if (isVisibleInDom('latest-levels')) {
        setLoadLatestLevels(true);
      }

      if (isVisibleInDom('latest-reviews')) {
        setLoadLatestReviews(true);
      }

      if (isVisibleInDom('level-of-day')) {
        setLoadLevelOfDay(true);
      }

      if (isVisibleInDom('recommended-level')) {
        setLoadRecommendedLevel(true);
      }

      if (isVisibleInDom('recommended-unattempted-level')) {
        setLoadRecommendedUnattemptedLevel(true);
      }

      if (isVisibleInDom('top-levels-of-month')) {
        setLoadTopLevelsThisMonth(true);
      }
    };

    checkDomVisibility();
    // check on scroll or resize
    window.addEventListener('scroll', checkDomVisibility);
    window.addEventListener('resize', checkDomVisibility);

    return () => {
      window.removeEventListener('scroll', checkDomVisibility);
      window.removeEventListener('resize', checkDomVisibility);
    };
  }, []);

  const chunks = [
    loadLastLevelPlayed ? [HomepageDataType.LastLevelPlayed] : [],
    loadLatestLevels ? [HomepageDataType.LatestLevels] : [],
    loadLatestReviews ? [HomepageDataType.LatestReviews] : [],
    loadLevelOfDay ? [HomepageDataType.LevelOfDay] : [],
    loadRecommendedLevel ? [HomepageDataType.RecommendedLevel] : [],
    loadRecommendedUnattemptedLevel ? [HomepageDataType.RecommendedUnattemptedLevel] : [],
    loadTopLevelsThisMonth ? [HomepageDataType.TopLevelsThisMonth] : [],
  ].map((chunk) => chunk.filter((x) => x));

  const { cache } = useSWRConfig();

  // clear cache
  useEffect(() => {
    for (const key of cache.keys()) {
      if (
        key.includes(HomepageDataType.LastLevelPlayed) ||
        key.includes(HomepageDataType.LatestLevels) ||
        key.includes(HomepageDataType.LatestReviews) ||
        key.includes(HomepageDataType.LevelOfDay) ||
        key.includes(HomepageDataType.RecommendedLevel) ||
        key.includes(HomepageDataType.RecommendedUnattemptedLevel) ||
        key.includes(HomepageDataType.TopLevelsThisMonth)
      ) {
        cache.delete(key);
      }
    }
  }, [cache]);

  const { data: chunk1 } = useHomePageData(chunks[0]);
  const { data: chunk2 } = useHomePageData(chunks[1]);
  const { data: chunk3 } = useHomePageData(chunks[2]);
  const { data: chunk4 } = useHomePageData(chunks[3]);
  const { data: chunk5 } = useHomePageData(chunks[4]);
  const { data: chunk6 } = useHomePageData(chunks[5]);
  const { data: chunk7 } = useHomePageData(chunks[6]);

  const dataMerge = {
    ...chunk1,
    ...chunk2,
    ...chunk3,
    ...chunk4,
    ...chunk5,
    ...chunk6,
    ...chunk7,
  };

  let lastLevelPlayed = undefined;
  let latestLevels = undefined;
  let latestReviews = undefined;
  let levelOfDay = undefined;
  let recommendedLevel = undefined;
  let recommendedUnattemptedLevel = undefined;
  let topLevelsThisMonth = undefined;

  if (dataMerge as HomepageDataProps) {
    lastLevelPlayed = dataMerge[HomepageDataType.LastLevelPlayed];
    latestLevels = dataMerge[HomepageDataType.LatestLevels];
    latestReviews = dataMerge[HomepageDataType.LatestReviews];
    levelOfDay = dataMerge[HomepageDataType.LevelOfDay];
    recommendedLevel = dataMerge[HomepageDataType.RecommendedLevel];
    recommendedUnattemptedLevel = dataMerge[HomepageDataType.RecommendedUnattemptedLevel];
    topLevelsThisMonth = dataMerge[HomepageDataType.TopLevelsThisMonth];
  }

  return (
    <Page title={'Pathology'}>
      <HomeLoggedIn
        lastLevelPlayed={lastLevelPlayed}
        latestLevels={latestLevels}
        latestReviews={latestReviews}
        levelOfDay={levelOfDay}
        recommendedLevel={recommendedLevel}
        recommendedUnattemptedLevel={recommendedUnattemptedLevel}
        topLevelsThisMonth={topLevelsThisMonth}
        user={user}
      />
    </Page>
  );
}
