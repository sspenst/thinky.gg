import Game, { GameState } from '../../../components/level/game';
import React, { useCallback, useEffect, useState } from 'react';
import BlockState from '../../../models/blockState';
import Dimensions from '../../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import Head from 'next/head';
import LayoutContainer from '../../../components/level/layoutContainer';
import Level from '../../../models/db/level';
import { LevelContext } from '../../../contexts/levelContext';
import LinkInfo from '../../../models/linkInfo';
import Move from '../../../models/move';
import Page from '../../../components/page';
import { ParsedUrlQuery } from 'querystring';
import Position from '../../../models/position';
import Record from '../../../models/db/record';
import Review from '../../../models/db/review';
import { SWRConfig } from 'swr';
import SkeletonPage from '../../../components/skeletonPage';
import SquareState from '../../../models/squareState';
import dbConnect from '../../../lib/dbConnect';
import { getLevelByUrlPath } from '../../api/level-by-slug/[username]/[slugName]';
import getSWRKey from '../../../helpers/getSWRKey';
import styles from '../../../components/level/Controls.module.css';
import toast from 'react-hot-toast';
import useLevelBySlug from '../../../hooks/useLevelBySlug';
import { useRouter } from 'next/router';
import useWorldById from '../../../hooks/useWorldById';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

export interface LevelUrlQueryParams extends ParsedUrlQuery {
  slugName: string;
  username: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { slugName, username } = context.params as LevelUrlQueryParams;
  const level = await getLevelByUrlPath(username, slugName);

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as LevelSWRProps,
    revalidate: 60 * 60,
  };
}

interface LevelSWRProps {
  level: Level;
}

export default function LevelSWR({ level }: LevelSWRProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <SkeletonPage/>;
  }

  if (!level) {
    return <SkeletonPage text={'Level not found'}/>;
  }

  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-slug/${level.slug}`)]: level } }}>
      <LevelPage/>
    </SWRConfig>
  );
}

function LevelPage() {
  const [initialState, setInitialState] = useState<GameState>();
  const [levelHash, setLevelHash] = useState<string>();
  const router = useRouter();
  const { slugName, username, wid } = router.query as LevelUrlQueryParams;
  const { level, mutateLevel } = useLevelBySlug(username + '/' + slugName);
  const { world } = useWorldById(wid);
  const folders: LinkInfo[] = [];

  if (!world || !world.userId.isOfficial) {
    folders.push(
      new LinkInfo('Catalog', '/catalog'),
    );
  }

  if (world) {
    // if a world id was passed to the page we can show more directory info
    const universe = world.userId;

    folders.push(
      new LinkInfo(universe.name, `/universe/${universe._id}`),
      new LinkInfo(world.name, `/world/${world._id}`),
    );
  } else if (level) {
    // otherwise we can only give a link to the author's universe
    folders.push(
      new LinkInfo(level.userId.name, `/universe/${level.userId._id}`),
    );
  }

  useEffect(() => {
    if (!level) {
      return;
    }

    setLevelHash(level._id + '_' + level.ts);
  }, [level]);

  useEffect(() => {
    if (!levelHash) {
      return;
    }

    const str = window.sessionStorage.getItem(levelHash);

    if (str) {
      const localObj = JSON.parse(str);

      if (localObj.gameState) {
        const gameState = JSON.parse(localObj.gameState) as GameState;

        setInitialState({
          actionCount: gameState.actionCount,
          blocks: gameState.blocks.map(block => BlockState.clone(block)),
          board: gameState.board.map(row => {
            return row.map(square => SquareState.clone(square));
          }),
          height: gameState.height,
          moveCount: gameState.moveCount,
          moves: gameState.moves.map(move => Move.clone(move)),
          pos: new Position(gameState.pos.x, gameState.pos.y),
          width: gameState.width,
        });
      }
    }
  }, [levelHash]);

  const onMove = useCallback((gameState: GameState) => {
    if (!levelHash) {
      return;
    }

    const gameStateMarshalled = JSON.stringify(gameState);

    window.sessionStorage.setItem(levelHash, JSON.stringify({
      'saved': Date.now(),
      'gameState': gameStateMarshalled,
    }));
  }, [levelHash]);

  const onComplete = useCallback(() => {
    // find <button> with id 'btn-next'
    const nextButton = document.getElementById('btn-next') as HTMLButtonElement;

    // add css style to have it blink
    nextButton?.classList.add(styles['highlight-once']);
    setTimeout(() => {
      nextButton?.classList.remove(styles['highlight-once']);
    }, 1300);
  }, []);

  const onNext = function() {
    if (!world) {
      return;
    }

    let nextUrl = `/world/${world._id}`;

    // search for index of level._id in world.levels
    if (world.levels && level) {
      const levelIndex = world.levels.findIndex((l) => l._id === level._id);

      if (levelIndex + 1 < world.levels.length) {
        const nextLevel = world.levels[levelIndex + 1];

        nextUrl = `/level/${nextLevel.slug}?wid=${world._id}`;
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

  // subtitle is only useful when a level is within a world created by a different user
  const showSubtitle = world && level && world.userId._id !== level.userId._id;
  const ogImageUrl = '/api/level/image/' + level?._id.toString() + '.png';
  const twitterImageUrl = 'https://pathology.k2xl.com' + ogImageUrl;
  const ogUrl = '/level/' + level?.slug ;

  return (
    <>
      <Head>
        <meta name='description' content={level?.authorNote} key='description'/>
        <meta property='og:title' content={level?.name} key='og_title'/>
        <meta property='og:description' content={level?.authorNote} key='og_description'/>
        <meta name="twitter:card" content="summary_large_image" key='twitter_card'></meta>
        <meta name="twitter:site" content="https://pathology.k2xl.com" key='twitter_site'></meta>
        <meta name="twitter:creator" content="@k2xl" key='twitter_creator'></meta>
        <meta name='twitter:description' content={level?.authorNote} key='twitter_description'/>
        <meta name='twitter:image' content={twitterImageUrl} key='twitter_image' />
        <meta property='og:type' content='article' key='og_article'/>
        <meta property='og:url' content={ogUrl} key='og_url' />
        <meta property='og:image' content={ogImageUrl} key='og_image' />
        <meta property='og:image:width' content={`${Dimensions.LevelCanvasWidth}`} />
        <meta property='og:image:height' content={`${Dimensions.LevelCanvasHeight}`} />
      </Head>
      <LevelContext.Provider value={{
        getReviews: getReviews,
        level: level,
        records: records,
        reviews: reviews,
      }}>
        <Page
          folders={folders}
          subtitle={showSubtitle ? level.userId.name : undefined}
          subtitleHref={showSubtitle ? `/profile/${level.userId._id}` : undefined}
          title={level?.name ?? 'Loading...'}
        >
          {!level || level.isDraft ? <></> :
            <LayoutContainer>
              <Game
                initState={initialState}
                key={level._id.toString()}
                level={level}
                mutateLevel={mutateLevel}
                onComplete={world ? onComplete : undefined}
                onMove={onMove}
                onNext={world ? onNext : undefined}
              />
            </LayoutContainer>
          }
        </Page>
      </LevelContext.Provider>
    </>
  );
}
