/* istanbul ignore file */

import { NextSeo } from 'next-seo';
import React, { useState } from 'react';
import Page from '../../components/page';
import Tutorial from '../../components/tutorial';

export default function TutorialPage() {
  const [isFullScreen, setIsFullScreen] = useState(false);

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
    <Page isFullScreen={isFullScreen} title={'Tutorial'}>
      <Tutorial setIsFullScreen={setIsFullScreen} />
    </Page>
  </>);
}
