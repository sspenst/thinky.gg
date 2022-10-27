import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import formattedAuthorNote from '../formattedAuthorNote';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

export default function Sidebar() {
  const levelContext = useContext(LevelContext);
  const { windowSize } = useContext(PageContext);

  return (
    <div
      className='border-l p-4 break-words hidden xl:block'
      style={{
        borderColor: 'var(--bg-color-4)',
        height: windowSize.height,
        overflowY: 'scroll',
        width: Dimensions.SidebarWidth,
      }}
    >
      {!levelContext?.level ? null :
        <>
          {!levelContext.level.authorNote ? null :
            <div className='mb-4'>
              {formattedAuthorNote(levelContext.level.authorNote)}
            </div>
          }
          <div className='mb-4'>
            <FormattedLevelInfo level={levelContext.level} />
          </div>
          <FormattedLevelReviews />
        </>
      }
    </div>
  );
}
