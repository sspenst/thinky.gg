/* istanbul ignore file */
import PagePath from '@root/constants/pagePath';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { useTour } from '@root/hooks/useTour';
import { CollectionType } from '@root/models/constants/collection';
import Collection, { EnrichedCollection } from '@root/models/db/collection';
import { getCollection } from '@root/pages/api/collection-by-id/[id]';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import { useRouter } from 'next/router';
import { NextSeo } from 'next-seo';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import LinkInfo from '../../../components/formatted/linkInfo';
import GameWrapper from '../../../components/level/gameWrapper';
import Page from '../../../components/page/page';
import Dimensions from '../../../constants/dimensions';
import { LevelContext } from '../../../contexts/levelContext';
import getProfileSlug from '../../../helpers/getProfileSlug';
import useProStatsLevel from '../../../hooks/useProStatsLevel';
import { getUserFromToken } from '../../../lib/withAuth';
import { EnrichedLevel } from '../../../models/db/level';
import Record from '../../../models/db/record';
import Review from '../../../models/db/review';
import User from '../../../models/db/user';
import { getLevelByUrlPath } from '../../api/level-by-slug/[username]/[slugName]';

export interface LevelUrlQueryParams extends ParsedUrlQuery {
  cid?: string;
  play?: string;
  slugName: string;
  username: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { slugName, username } = context.params as LevelUrlQueryParams;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const gameId = getGameIdFromReq(context.req);
  const cid = context.query?.cid as string | undefined;
  // TODO: technically we could get the level from the collection instead of separately querying for it
  // If cid doesn't exist then we can just call getLevelsByUrlPath...
  const [level, collection] = await Promise.all([
    getLevelByUrlPath(gameId, username, slugName, reqUser),
    (cid) ? getCollection({
      matchQuery: { _id: new Types.ObjectId(cid), gameId: gameId },
      reqUser,
      populateLevels: true,
      populateAroundSlug: username + '/' + slugName,
      populateLevelDirection: 'around',
    }) : null,
  ]);

  if (!level) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      _collection: JSON.parse(JSON.stringify(collection)),
      _level: JSON.parse(JSON.stringify(level)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    } as LevelProps,
  };
}

interface LevelProps {
  _collection: EnrichedCollection | null;
  _level: EnrichedLevel;
  reqUser: User | null;
}

export default function LevelPage({ _collection, _level, reqUser }: LevelProps) {
  const [collection, setCollection] = useState<EnrichedCollection | Collection | null>(_collection);
  const [level, setLevel] = useState(_level);
  const { mutateProStatsLevel, proStatsLevel } = useProStatsLevel(level);
  const router = useRouter();
  const { tempCollection, setTempCollection } = useContext(AppContext);
  const { chapter, cid, slugName, ts, username } = router.query as LevelUrlQueryParams;

  const mutateCollection = useCallback(async () => {
    if (!collection) {
      return;
    }

    if (collection.type === CollectionType.InMemory) {
      // let's redo the search query
      const searchQuery = collection.slug;
      const url = '/api/levels';
      const ts = new Date();

      const res = await fetch(url, {
        body: JSON.stringify({
          ids: collection.levels.map(l => l._id.toString())
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (res.ok) {
        const resp = await res.json();
        const collectionTemp = {
          createdAt: ts,
          isPrivate: true,
          levels: resp, _id: new Types.ObjectId(),
          name: 'Search',
          slug: searchQuery,
          type: CollectionType.InMemory,
          updatedAt: ts,
          userId: { _id: new Types.ObjectId() } as Types.ObjectId & User,
        } as EnrichedCollection;

        sessionStorage.setItem('tempCollection', JSON.stringify(collectionTemp));
        setCollection(collectionTemp);
        setTempCollection(collectionTemp);
      }

      return;
    }

    if (!cid) {
      return;
    }

    fetch(`/api/collection-by-id/${cid}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setCollection(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching collection');
    });
  }, [cid, collection, setTempCollection]);

  useEffect(() => {
    if (!_collection && tempCollection && tempCollection.levels.find(l => l._id === level._id)) {
      setCollection(tempCollection);
    }
  }, [_collection, level._id, setTempCollection, tempCollection]);

  // handle pressing "Next level"
  useEffect(() => {
    setLevel(_level);
  }, [_level]);

  const mutateLevel = useCallback(() => {
    // TODO: if we change this to level by id, then we could auto-redirect you to the new slug if the level name updates
    fetch(`/api/level-by-slug/${username}/${slugName}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setLevel(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching level');
    });
  }, [slugName, username]);

  const changeLevel = function(next: boolean) {
    if (!collection) {
      return;
    }

    let url = chapter ? `/chapter${chapter}` : `/collection/${collection.slug}`;

    // search for index of level._id in collection.levels
    if (collection.levels) {
      const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

      if (next) {
        if (levelIndex + 1 < collection.levels.length) {
          const nextLevel = collection.levels[levelIndex + 1];

          url = `/level/${nextLevel.slug}?cid=${collection._id}${chapter ? `&chapter=${chapter}` : ''}`;
        } else {
          // if we are at the end of the collection...

        }
      } else {
        if (levelIndex - 1 >= 0) {
          const prevLevel = collection.levels[levelIndex - 1];

          url = `/level/${prevLevel.slug}?cid=${collection._id}${chapter ? `&chapter=${chapter}` : ''}`;
        } else {
          // if we are at the start of the collection...

        }
      }
    }

    router.push(url);
  };

  const [records, setRecords] = useState<Record[]>();

  const getRecords = useCallback(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level._id, level.leastMoves]);

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const [reviews, setReviews] = useState<Review[]>();

  const getReviews = useCallback(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level._id, level.calc_reviews_count]);

  useEffect(() => {
    getReviews();
  }, [getReviews]);

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

    // TODO: this is a hack to handle tempCollection
    if (user?.name !== undefined) {
      folders.push(new LinkInfo(user.name, `/profile/${user.name}/collections`));
    }

    folders.push(new LinkInfo(collection.name, `/collection/${collection.slug}`));
  } else {
    // otherwise we can only give a link to the author's levels
    folders.push(new LinkInfo(level.userId.name, `/profile/${level.userId.name}/levels`));
  }

  // subtitle is only useful when a level is within a collection created by a different user
  const showSubtitle = collection && (collection.userId._id !== level.userId._id);
  const ogImageUrl = `https://pathology.gg/api/level/image/${level._id.toString()}.png${ts ? `?ts=${ts}` : ''}`;
  const ogUrl = `https://pathology.gg/level/${level.slug}`;
  const ogFullUrl = `https://pathology.gg${ogUrl}`;
  const authorNote = level.authorNote ? level.authorNote : `${level.name} by ${level.userId.name}`;
  const tour = useTour(PagePath.LEVEL, undefined, true);

  return (
    <>
      {tour}
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
        getReviews: getReviews,
        inCampaign: !!chapter && level.userMoves !== level.leastMoves,
        level: level,
        mutateCollection: mutateCollection,
        mutateLevel: mutateLevel,
        mutateProStatsLevel: mutateProStatsLevel,
        proStatsLevel: proStatsLevel,
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
          <GameWrapper
            chapter={chapter as string | undefined}
            collection={collection}
            setCollection={setCollection}
            level={level}
            onNext={() => changeLevel(true)}
            onPrev={() => changeLevel(false)}
            user={reqUser}
          />
        </Page>
      </LevelContext.Provider>
    </>
  );
}
