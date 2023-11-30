/* istanbul ignore file */

import { AppContext } from '@root/contexts/appContext';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';
import Tutorial from '../../components/homepage/tutorial';

export default function TutorialPage() {
  const { game } = useContext(AppContext);

  return (<>
    <NextSeo
      title={'Tutorial - ' + game.displayName}
      canonical={`https://${game.baseUrl}/tutorial`}
      openGraph={{
        title: 'Tutorial - ' + game.displayName,
        description: 'Learn how to play ' + game.displayName + ' - The sokoban style mind-bending puzzle game',
        type: 'article',
        url: '/tutorial',
      }}
    />
    <Tutorial />
  </>);
}
