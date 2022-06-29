import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import cleanAuthorNote from '../../helpers/cleanAuthorNote';

export default function Sidebar() {
  const levelContext = useContext(LevelContext);
  const { windowSize } = useContext(PageContext);

  return (
    <div className='border-l p-4' style={{
      borderColor: 'var(--bg-color-4)',
      position: 'absolute',
      height: windowSize.height,
      overflowY: 'scroll',
      right: 0,
      width: Dimensions.SidebarWidth,
    }}>
      {!levelContext?.level ? null :
        <>
          {!levelContext.level.authorNote ? null :
            <div className='mb-4'>
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {cleanAuthorNote(levelContext.level.authorNote)}
              </span>
            </div>
          }
          <div className='mb-4'>
            <FormattedLevelInfo level={levelContext.level} />
          </div>
          <FormattedLevelReviews levelId={levelContext.level._id.toString()} />
        </>
      }
    </div>
  );
}
