/* istanbul ignore file */

import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SWRConfig } from 'swr';
import GameWrapper from '../../../components/level/gameWrapper';
import LinkInfo from '../../../components/linkInfo';
import Page from '../../../components/page';
import SkeletonPage from '../../../components/skeletonPage';
import Dimensions from '../../../constants/dimensions';
import { LevelContext } from '../../../contexts/levelContext';
import getProfileSlug from '../../../helpers/getProfileSlug';
import getSWRKey from '../../../helpers/getSWRKey';
import useCollectionById from '../../../hooks/useCollectionById';
import useLevelBySlug from '../../../hooks/useLevelBySlug';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Review from '../../../models/db/review';
import Stat from '../../../models/db/stat';
import { getLevelByUrlPath } from '../../api/level-by-slug/[username]/[slugName]';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

export interface LevelUrlQueryParams extends ParsedUrlQuery {
  cid?: string;
  play?: string;
  slugName: string;
  username: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  const { slugName, username } = context.params as LevelUrlQueryParams;
  const token = context.req?.cookies?.token;
  // Note, that in getStaticProps token will always be null...
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const level = await getLevelByUrlPath(username, slugName, reqUser);

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as LevelSWRProps,
    revalidate: 60 * 60,
  };
}

interface LevelSWRProps {
  level: Level | null;
}

export default function LevelSWR({ level }: LevelSWRProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <SkeletonPage />;
  }

  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-slug/${level?.slug}`)]: level } }}>
      <LevelPage />
    </SWRConfig>
  );
}

function LevelPage() {
  const router = useRouter();
  const { chapter, cid, slugName, username } = router.query as LevelUrlQueryParams;
  const { collection } = useCollectionById(cid);
  const { level, mutateLevel } = useLevelBySlug(username + '/' + slugName);

  const changeLevel = function(next: boolean) {
    if (!collection) {
      return;
    }

    let url = chapter ? `/chapter${chapter}` : `/collection/${collection.slug}`;

    // search for index of level._id in collection.levels
    if (collection.levels && level) {
      const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

      if (next) {
        if (levelIndex + 1 < collection.levels.length) {
          const nextLevel = collection.levels[levelIndex + 1];

          url = `/level/${nextLevel.slug}?cid=${collection._id}${chapter ? `&chapter=${chapter}` : ''}`;
        }
      } else {
        if (levelIndex - 1 >= 0) {
          const prevLevel = collection.levels[levelIndex - 1];

          url = `/level/${prevLevel.slug}?cid=${collection._id}${chapter ? `&chapter=${chapter}` : ''}`;
        }
      }
    }

    router.push(url);
  };

  const [completions, setCompletions] = useState<Stat[]>();

  const getCompletions = useCallback((all: boolean) => {
    if (!level) {
      return;
    }

    fetch(`/api/completions/${level._id}?all=${all}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setCompletions(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching completions');
    });
  }, [level]);

  useEffect(() => {
    getCompletions(false);
  }, [getCompletions]);

  const [records, setRecords] = useState<Record[]>();

  const getRecords = useCallback(() => {
    if (!level?._id) {
      return;
    }

    fetch(`/api/records/${level._id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setRecords(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching records');
    });
  }, [level?._id]);

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const [reviews, setReviews] = useState<Review[]>();

  const getReviews = useCallback(() => {
    if (!level) {
      return;
    }

    fetch(`/api/reviews/${level._id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setReviews(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching reviews');
    });
  }, [level]);

  useEffect(() => {
    getReviews();
  }, [getReviews]);

  if (!level || !level.userId) {
    return <SkeletonPage text={'Level not found'} />;
  }

  const folders: LinkInfo[] = [];

  if (chapter) {
    folders.push(
      new LinkInfo('Chapter Select', '/play'),
      new LinkInfo(`Chapter ${chapter}`, `/chapter${chapter}`),
    );

    if (collection) {
      folders.push(new LinkInfo(`${collection.name}`, `/chapter${chapter}`));
    }
  } else if (collection) {
    // if a collection id was passed to the page we can show more directory info
    const user = collection.userId;

    if (user) {
      folders.push(new LinkInfo(user.name, `/profile/${user.name}/collections`));
    }

    folders.push(new LinkInfo(collection.name, `/collection/${collection.slug}`));
  } else if (level) {
    // otherwise we can only give a link to the author's levels
    folders.push(new LinkInfo(level.userId.name, `/profile/${level.userId.name}/levels`));
  }

  // subtitle is only useful when a level is within a collection created by a different user
  const showSubtitle = collection && level && (collection.userId._id !== level.userId._id);
  const ogImageUrl = '/api/level/image/' + level._id.toString() + '.png';
  const ogUrl = '/level/' + level.slug;
  const ogFullUrl = 'https://pathology.gg' + ogUrl;
  const authorNote = level.authorNote ? level.authorNote : level.name + ' by ' + level.userId.name;

  return (
    <>
      <NextSeo
        title={`${level.name} - Pathology`}
        description={authorNote}
        canonical={ogFullUrl}
        openGraph={{
          title: `${level.name} - Pathology`,
          description: authorNote,
          type: 'article',
          url: ogUrl,
          images: [
            {
              url: ogImageUrl,
              width: Dimensions.LevelCanvasWidth,
              height: Dimensions.LevelCanvasHeight,
              alt: level.name,
              type: 'image/png',
            },
          ],
        }}
      />
      <LevelContext.Provider value={{
        completions: completions,
        getCompletions: getCompletions,
        getReviews: getReviews,
        inCampaign: !!chapter && level.userMoves !== level.leastMoves,
        level: level,
        records: records,
        reviews: reviews,
      }}>
        <Page
          folders={folders}
          isFullScreen={true}
          subtitle={showSubtitle ? level.userId.name : undefined}
          subtitleHref={showSubtitle ? getProfileSlug(level.userId) : undefined}
          title={level.name ?? 'Loading...'}
        >
          {!level || level.isDraft ? <></> :
            <GameWrapper
              collection={collection}
              level={level}
              mutateLevel={mutateLevel}
              onNext={() => changeLevel(true)}
              onPrev={() => changeLevel(false)}
            />
          }
        </Page>
      </LevelContext.Provider>
    </>
  );
}
