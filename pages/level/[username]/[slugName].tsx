/* istanbul ignore file */

import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SWRConfig } from 'swr';
import styles from '../../../components/level/Controls.module.css';
import Game from '../../../components/level/game';
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
import useUser from '../../../hooks/useUser';
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
  const { user } = useUser();

  const signUpToast = useCallback(() => {
    toast.dismiss();
    toast.success(
      <div className='flex flex-row'>
        <div>
          <h1 className='text-center text-2xl'>Good job!</h1>
          <h2 className='text-center text-sm'>But your progress isn&apos;t saved...</h2>
          <div className='text-center'>
            <Link href='/signup' className='underline font-bold'>Sign up</Link> (free) to save your progress and get access to more features.
          </div>
        </div>
        <svg className='h-5 w-5 my-1.5 ml-2 cursor-pointer' fill={'var(--bg-color-4)'} version='1.1' id='Capa_1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 460.775 460.775' xmlSpace='preserve' onClick={() => toast.dismiss()}>
          <path d='M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
          c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
          c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
          c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
          l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
          c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z' />
        </svg>
      </div>
      ,
      {
        duration: 10000,
        icon: '🎉',
      });
  }, []);

  const addNextButtonHighlight = useCallback(() => {
    // find <button> with id 'btn-next'
    const nextButton = document.getElementById('btn-next') as HTMLButtonElement;

    // add css style to have it blink
    nextButton?.classList.add(styles['highlight-once']);
    setTimeout(() => {
      nextButton?.classList.remove(styles['highlight-once']);
    }, 1300);
  }, []);

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
  const ogImageUrl = '/api/level/image/' + level?._id.toString() + '.png';
  const ogUrl = '/level/' + level?.slug;
  const ogFullUrl = 'https://pathology.gg' + ogUrl;
  const authorNote = level?.authorNote ? level.authorNote : level.name + ' by ' + level.userId.name;

  return (
    <>
      <NextSeo
        title={level.name} description={authorNote} canonical={ogFullUrl} openGraph={{
          title: level?.name,
          description: authorNote,
          type: 'article',
          url: ogUrl,
          images: [
            {
              url: ogImageUrl,
              width: Dimensions.LevelCanvasWidth,
              height: Dimensions.LevelCanvasHeight,
              alt: level?.name,
            },
          ],
          site_name: 'Pathology',
        }} twitter={{
          handle: '@pathologygame',
          site: 'https://pathology.gg',
          cardType: 'summary_large_image',
        }} />

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
          title={level?.name ?? 'Loading...'}
        >
          {!level || level.isDraft ? <></> :
            <Game
              allowFreeUndo={true}
              disableServer={!user}
              enableLocalSessionRestore={true}
              key={`game-${level._id.toString()}`}
              level={level}
              mutateLevel={mutateLevel}
              onComplete={() => {
                if (!user) {
                  signUpToast();
                }

                if (collection) {
                  addNextButtonHighlight();
                }
              }}
              onNext={collection ? onNext : undefined}
            />
          }
        </Page>
      </LevelContext.Provider>
    </>
  );
}
