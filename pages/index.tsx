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
        <HomeVideo />
        <div className='flex flex-wrap justify-center m-4'>
          {levelOfDay && <LevelOfTheDay level={levelOfDay} />}
        </div>
        <HomeDefault />
      </>
    </Page>
  );
}
