import { NextSeo } from 'next-seo';
import React from 'react';
import { SWRConfig } from 'swr';
import HomeDefault from '../components/homeDefault';
import HomeVideo from '../components/homeVideo';
import LevelOfTheDay from '../components/levelOfTheDay';
import Page from '../components/page';
import getSWRKey from '../helpers/getSWRKey';
import useLevelOfDay from '../hooks/useLevelOfDay';
import { EnrichedLevel } from '../models/db/level';
import { getLevelOfDay } from './api/level-of-day';

export async function getStaticProps() {
  const levelOfDay = await getLevelOfDay();

  return {
    props: {
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
    } as AppSWRProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levelOfDay: EnrichedLevel;
}

/* istanbul ignore next */
export default function AppSWR({ levelOfDay }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/level-of-day')]: levelOfDay,
    } }}>
      <App />
    </SWRConfig>
  );
}

/* istanbul ignore next */
function App() {
  const { levelOfDay } = useLevelOfDay();

  return (
    <Page title={'Pathology'}>
      <>
        <NextSeo
          title={'Pathology - Shortest Path Puzzle Game'}
          openGraph={{
            title: 'Pathology - Shortest Path Puzzle Game',
            description: 'The goal of Pathology is simple. Get to the exit in the least number of moves. Sounds easy right? Yet, this game is one of the most mind-bending puzzle games you will find. Different blocks stand in your way to the exit, and your job is to figure out the optimal route',
            images: [
              {
                url: 'https://pathology.gg/logo.png',
                width: 128,
                height: 128,
                alt: 'Pathology Logo',
                type: 'image/png',
              },
            ],
          }}
        />
        <HomeVideo />
        <div className='flex flex-wrap justify-center m-4'>
          {levelOfDay && <LevelOfTheDay level={levelOfDay} />}
        </div>
        <HomeDefault />
      </>
    </Page>
  );
}
