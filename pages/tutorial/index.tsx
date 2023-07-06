/* istanbul ignore file */

import { NextSeo } from 'next-seo';
import React from 'react';
import Tutorial from '../../components/tutorial';

export default function TutorialPage() {
  return (<>
    <NextSeo
      title={'Tutorial - Pathology'}
      canonical={'https://pathology.gg/tutorial'}
      openGraph={{
        title: 'Tutorial - Pathology',
        type: 'article',
        url: '/tutorial',
      }}
    />
    <Tutorial />
  </>);
}
