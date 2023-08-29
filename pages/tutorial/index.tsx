/* istanbul ignore file */

import { NextSeo } from 'next-seo';
import React from 'react';
import Tutorial from '../../components/homepage/tutorial';

export default function TutorialPage() {
  return (<>
    <NextSeo
      title={'Tutorial - Pathology'}
      canonical={'https://pathology.gg/tutorial'}
      openGraph={{
        title: 'Tutorial - Pathology',
        description: 'Learn how to play Pathology - The sokoban style mind-bending puzzle game',
        type: 'article',
        url: '/tutorial',
      }}
    />
    <Tutorial />
  </>);
}
