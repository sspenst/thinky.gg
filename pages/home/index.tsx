import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useEffect } from 'react';
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

interface HomeProps {
  user: User;
}

/* istanbul ignore next */
export default function Home({ user }: HomeProps) {
  // Only load latest levels if scroll position is not at top
  const [hasScrolled, setHasScrolled] = React.useState(false);

  useEffect(() => {
    // check scroll position
    if (window.scrollY > 0) {
      setHasScrolled(true);
    }

    const onScroll = () => {
      if (window.scrollY > 0) {
        setHasScrolled(true);
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const chunks = [
    [HomepageDataType.LevelOfDay],
    [HomepageDataType.LastLevelPlayed],
    [HomepageDataType.RecommendedPendingLevel],
    [HomepageDataType.RecommendedEasyLevel],
    [HomepageDataType.TopLevelsThisMonth],
    hasScrolled ? [HomepageDataType.LatestLevels] : [],
    hasScrolled ? [HomepageDataType.LatestReviews] : [],
  ].map((chunk) => chunk.filter((x) => x));

  const { cache } = useSWRConfig();

  // clear cache
  useEffect(() => {
    for (const key of cache.keys()) {
      if (key.includes(HomepageDataType.RecommendedPendingLevel) || key.includes(HomepageDataType.RecommendedEasyLevel) || key.includes(HomepageDataType.LastLevelPlayed)) {
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
  let recommendedEasyLevel = undefined;
  let recommendedPendingLevel = undefined;
  let topLevelsThisMonth = undefined;

  if (dataMerge as HomepageDataProps) {
    lastLevelPlayed = dataMerge[HomepageDataType.LastLevelPlayed];
    latestLevels = dataMerge[HomepageDataType.LatestLevels];
    latestReviews = dataMerge[HomepageDataType.LatestReviews];
    levelOfDay = dataMerge[HomepageDataType.LevelOfDay];
    recommendedEasyLevel = dataMerge[HomepageDataType.RecommendedEasyLevel];
    recommendedPendingLevel = dataMerge[HomepageDataType.RecommendedPendingLevel];
    topLevelsThisMonth = dataMerge[HomepageDataType.TopLevelsThisMonth];
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
