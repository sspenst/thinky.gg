import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import getHomeDefault from '@root/helpers/getComponentFromGame';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext } from 'next';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';
import { SWRConfig } from 'swr';
import Page from '../../components/page/page';
import getSWRKey from '../../helpers/getSWRKey';
import { EnrichedLevel } from '../../models/db/level';
import { getLevelOfDay } from '../api/level-of-day';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const gameId = getGameIdFromReq(context.req);
  const levelOfDay: EnrichedLevel | null = await getLevelOfDay(gameId);

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
      levelOfDay: JSON.parse(JSON.stringify(levelOfDay)),
    } as AppSWRProps,
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
  const { game } = useContext(AppContext);

  return (
    <Page title={game.displayName}>
      <>
        <NextSeo
          title={game.SEOTitle}
          openGraph={{
            title: game.SEOTitle,
            description: game.SEODescription,
            images: [
              {
                url: 'https://' + game.baseUrl + game.logo,
                width: 128,
                height: 128,
                alt: game.displayName + ' Logo',
                type: 'image/png',
              },
            ],
          }}
        />
        {getHomeDefault(game)}
      </>
    </Page>
  );
}
