import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

export default function Sidebar() {
  const levelContext = useContext(LevelContext);
  const { windowSize } = useContext(PageContext);

  return (
    <div
      className='border-l p-4 break-words hidden xl:block z-10'
      style={{
        borderColor: 'var(--bg-color-4)',
        height: windowSize.height,
        overflowY: 'scroll',
        width: Dimensions.SidebarWidth,
      }}
    >
      {!levelContext?.level ? null :
        <>
          <div className='mb-4'>
            <FormattedLevelInfo level={levelContext.level} />
          </div>
          <div className='m-3' style={{
            backgroundColor: 'var(--bg-color-4)',
            height: 1,
          }} />
          <FormattedLevelReviews />
        </>
      }
    </div>
  );
}
