import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import FormattedLevelInfo from '../formattedLevelInfo';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import cleanAuthorNote from '../../helpers/cleanAuthorNote';

export default function Sidebar() {
  const levelContext = useContext(LevelContext);
  const { windowSize } = useContext(PageContext);

  if (!levelContext) {
    return null;
  }

  const { level, reviews } = levelContext;

  return (
    <div className='border-l p-4' style={{
      borderColor: 'var(--bg-color-4)',
      position: 'absolute',
      height: windowSize.height,
      overflowY: 'scroll',
      right: 0,
      width: Dimensions.SidebarWidth,
    }}>
      {!level?.authorNote ? null :
        <div className='mb-4'>
          <span style={{ whiteSpace: 'pre-wrap' }}>
            {cleanAuthorNote(level.authorNote)}
          </span>
        </div>
      }
      {!level ? null : <FormattedLevelInfo level={level} />}
    </div>
  );
}
