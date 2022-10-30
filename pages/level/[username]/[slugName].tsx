/* istanbul ignore file */

import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SWRConfig } from 'swr';
import GameWrapper from '../../../components/level/gameWrapper';
import LinkInfo from '../../../components/linkInfo';
import Page from '../../../components/page';
import SkeletonPage from '../../../components/skeletonPage';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import { LevelContext } from '../../../contexts/levelContext';
import getProfileSlug from '../../../helpers/getProfileSlug';
import getSWRKey from '../../../helpers/getSWRKey';
import useCollectionById from '../../../hooks/useCollectionById';
import useLevelBySlug from '../../../hooks/useLevelBySlug';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import Level from '../../../models/db/level';
import Record from '../../../models/db/record';
import Review from '../../../models/db/review';
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
  const [collections, setCollections] = useState<Collection[]>();
  const { shouldAttemptAuth } = useContext(AppContext);
  const router = useRouter();
  const { cid, play, slugName, username } = router.query as LevelUrlQueryParams;
  const { collection } = useCollectionById(cid);
  const { level, mutateLevel } = useLevelBySlug(username + '/' + slugName);

  const onNext = function() {
    if (!collection) {
      return;
    }

    let nextUrl = play ? `/play?cid=${collection._id}` : `/collection/${collection.slug}`;

    // search for index of level._id in collection.levels
    if (collection.levels && level) {
      const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

      if (levelIndex + 1 < collection.levels.length) {
        const nextLevel = collection.levels[levelIndex + 1];

        nextUrl = `/level/${nextLevel.slug}?cid=${collection._id}${play ? '&play=true' : ''}`;
      }
    }

    router.push(nextUrl);
  };

  const [records, setRecords] = useState<Record[]>();

  const getRecords = useCallback(() => {
    if (!level) {
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
  }, [level]);

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

  const getCollections = useCallback(() => {
    if (shouldAttemptAuth) {
      fetch('/api/collections', {
        method: 'GET',
      }).then(async res => {
        if (res.status === 200) {
          setCollections(await res.json());
        } else {
          throw res.text();
        }
      }).catch(err => {
        console.error(err);
      });
    }
  }, [shouldAttemptAuth]);

  useEffect(() => {
    getCollections();
  }, [getCollections]);

  if (!level) {
    return <SkeletonPage text={'Level not found'} />;
  }

  const folders: LinkInfo[] = [];

  if (play) {
    folders.push(new LinkInfo('Play', '/play'));
  }

  if (collection) {
    // if a collection id was passed to the page we can show more directory info
    if (play) {
      folders.push(new LinkInfo(collection.name, `/play?cid=${collection._id}`));
    } else {
      const user = collection.userId;

      if (user) {
        folders.push(new LinkInfo(user.name, `/profile/${user.name}/collections`));
      }

      folders.push(new LinkInfo(collection.name, `/collection/${collection.slug}`));
    }
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
            },
          ],
        }}
      />
      <LevelContext.Provider value={{
        collections: collections,
        getReviews: getReviews,
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
              onNext={onNext}
            />
          }
        </Page>
      </LevelContext.Provider>
    </>
  );
}
