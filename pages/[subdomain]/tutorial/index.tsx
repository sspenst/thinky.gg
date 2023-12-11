/* istanbul ignore file */

import { AppContext } from '@root/contexts/appContext';
import { getTutorialComponent } from '@root/helpers/getComponentFromGame';
import { NextSeo } from 'next-seo';
import React, { useContext } from 'react';

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
    {getTutorialComponent(game)}
  </>);
}
