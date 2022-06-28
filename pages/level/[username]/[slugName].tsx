import Game from '../../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Head from 'next/head';
import Level from '../../../models/db/level';
import LinkInfo from '../../../models/linkInfo';
import Page from '../../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import SkeletonPage from '../../../components/skeletonPage';
import dbConnect from '../../../lib/dbConnect';
import { getLevelByUrlPath } from '../../api/level-by-slug/[username]/[slugName]';
import getSWRKey from '../../../helpers/getSWRKey';
import styles from '../../../components/level/Controls.module.css';
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

  if (!level) {
    throw new Error(`Error finding Level ${username}/${slugName}`);
  }

  return {
    props: {
      level: level ? JSON.parse(JSON.stringify(level)) : null,
    } as LevelSWRProps,
    revalidate: 60 * 60,
  };
}

interface LevelSWRProps {
  level: Level;
}

export default function LevelSWR({ level }: LevelSWRProps) {
  const router = useRouter();

  if (router.isFallback || !level) {
    return <SkeletonPage/>;
  }

  return (
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level-by-slug/${level.slug}`)]: level } }}>
      <LevelPage/>
    </SWRConfig>
  );
}

function LevelPage() {
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

  const onComplete = function() {
    // find <button> with id 'btn-next'
    const nextButton = document.getElementById('btn-next') as HTMLButtonElement;

    // add css style to have it blink
    nextButton?.classList.add(styles['highlight-once']);
    setTimeout(() => {
      nextButton?.classList.remove(styles['highlight-once']);
    }, 1300);
  };

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

  // subtitle is only useful when a level is within a world created by a different user
  const showSubtitle = world && level && world.userId._id !== level.userId._id;
  const ogImageUrl = '/api/level/image/' + level?._id.toString();
  const ogUrl = '/level/' + level?.slug;

  return (
    <>
      <Head>
        <meta name='description' content={level?.authorNote} key='description'/>
        <meta property='og:title' content={level?.name} key='og_title'/>
        <meta property='og:description' content={level?.authorNote} key='og_description'/>
        <meta name="twitter:card" content="summary_large_image"></meta>
        <meta name="twitter:site" content="https://pathology.k2xl.com"></meta>
        <meta name="twitter:creator" content="@k2xl"></meta>
        <meta property='og:type' content='article' key='og_article'/>
        <meta property='og:url' content={ogUrl} key='og_url' />
        <meta property='og:image' content={ogImageUrl} key='og_image' />
        <meta property='twitter:image' content={ogImageUrl} key='og_image' />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
      </Head>
      <Page
        folders={folders}
        level={level}
        subtitle={showSubtitle ? level.userId.name : undefined}
        subtitleHref={showSubtitle ? `/profile/${level.userId._id}` : undefined}
        title={level?.name ?? 'Loading...'}
      >
        {!level || level.isDraft ? <></> :
          <Game
            key={level._id.toString()}
            level={level}
            mutateLevel={mutateLevel}
            onComplete={world ? onComplete : undefined}
            onNext={world ? onNext : undefined}
          />
        }
      </Page>
    </>
  );
}
