/* istanbul ignore file */

import React, { useState } from 'react';
import Page from '../../components/page';
import Tutorial from '../../components/tutorial';

export default function TutorialPage() {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <Page isFullScreen={isFullScreen} title={'Tutorial'}>
      <Tutorial setIsFullScreen={setIsFullScreen} />
    </Page>
  );
}
