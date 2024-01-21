/* istanbul ignore file */

import TutorialPathology from '@root/components/home/tutorialPathology';
import TutorialSokopath from '@root/components/home/tutorialSokopath';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext } from 'next';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const gameId = getGameIdFromReq(context.req);

  if (Games[gameId].disableTutorial) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function TutorialPage() {
  const { game } = useContext(AppContext);

  return (<>
    <NextSeo
      title={'Tutorial - ' + game.displayName}
      canonical={`${game.baseUrl}/tutorial`}
      openGraph={{
        title: 'Tutorial - ' + game.displayName,
        description: 'Learn how to play ' + game.displayName + ' - The sokoban style mind-bending puzzle game',
        type: 'article',
        url: '/tutorial',
      }}
    />
    {game.id === GameId.SOKOPATH ? <TutorialSokopath /> : <TutorialPathology />}
  </>);
}
