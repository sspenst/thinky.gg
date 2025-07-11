import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { NextSeo } from 'next-seo';
import { useContext, useEffect, useState } from 'react';
import { useSWRConfig } from 'swr';
import Home from '../../components/home';
import Page from '../../components/page/page';
import useHomePageData, { HomepageDataType } from '../../hooks/useHomePageData';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedLevel } from '../../models/db/level';
import Review from '../../models/db/review';
import User from '../../models/db/user';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);

  if (GameId.THINKY === gameId) {
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
    } as HomePageProps,
  };
}

/* istanbul ignore next */
export interface HomepageDataProps {
  lastLevelPlayed?: EnrichedLevel;
  latestLevels?: EnrichedLevel[];
  latestReviews?: Review[];
  levelOfDay?: EnrichedLevel;
  recommendedLevel?: EnrichedLevel;
  topLevelsThisMonth?: EnrichedLevel[];
}

/* istanbul ignore next */
interface HomePageProps {
  user: User | null;
}

/* istanbul ignore next */
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
export default function HomePage({ user }: HomePageProps) {
  const { game } = useContext(AppContext);
  const [loadLatestLevels, setLoadLatestLevels] = useState(false);
  const [loadLatestReviews, setLoadLatestReviews] = useState(false);
  const [loadLevelOfDay, setLoadLevelOfDay] = useState(false);
  const [loadRecommendedLevel, setLoadRecommendedLevel] = useState(false);
  const [loadTopLevelsThisMonth, setLoadTopLevelsThisMonth] = useState(false);

  useEffect(() => {
    const checkDomVisibility = () => {
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
        key.includes(HomepageDataType.TopLevelsThisMonth)
      ) {
        cache.delete(key);
      }
    }
  }, [cache]);

  const chunks = [
    [HomepageDataType.LastLevelPlayed],
    loadLatestLevels ? [HomepageDataType.LatestLevels] : [],
    loadLatestReviews ? [HomepageDataType.LatestReviews] : [],
    loadLevelOfDay ? [HomepageDataType.LevelOfDay] : [],
    loadRecommendedLevel && user ? [HomepageDataType.RecommendedLevel] : [],
    loadTopLevelsThisMonth ? [HomepageDataType.TopLevelsThisMonth] : [],
  ];

  const dataMerge = {
    ...useHomePageData(chunks[0]).data,
    ...useHomePageData(chunks[1]).data,
    ...useHomePageData(chunks[2]).data,
    ...useHomePageData(chunks[3]).data,
    ...useHomePageData(chunks[4]).data,
    ...useHomePageData(chunks[5]).data,
  } as HomepageDataProps;

  const lastLevelPlayed = dataMerge[HomepageDataType.LastLevelPlayed];
  const latestLevels = dataMerge[HomepageDataType.LatestLevels];
  const latestReviews = dataMerge[HomepageDataType.LatestReviews];
  const levelOfDay = dataMerge[HomepageDataType.LevelOfDay];
  const recommendedLevel = user ? dataMerge[HomepageDataType.RecommendedLevel] : null;
  const topLevelsThisMonth = dataMerge[HomepageDataType.TopLevelsThisMonth];

  return (
    <Page title='Home'>
      <NextSeo
        title={game.seoTitle}
        openGraph={{
          title: game.seoTitle,
          description: game.seoDescription,
          images: [
            {
              url: game.baseUrl + game.logo,
              width: 128,
              height: 128,
              alt: game.displayName + ' Logo',
              type: 'image/svg+xml',
            },
          ],
        }}
      />
      <Home
        lastLevelPlayed={lastLevelPlayed}
        latestLevels={latestLevels}
        latestReviews={latestReviews}
        levelOfDay={levelOfDay}
        recommendedLevel={recommendedLevel}
        topLevelsThisMonth={topLevelsThisMonth}
        user={user}
      />
    </Page>
  );
}
