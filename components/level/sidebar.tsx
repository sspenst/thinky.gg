import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import formattedAuthorNote from '../formattedAuthorNote';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

export default function Sidebar() {
  const [hideSidebar, setHideSidebar] = useState(false);
  const levelContext = useContext(LevelContext);
  const { forceUpdate, windowSize } = useContext(PageContext);

  // force the game layout to rerender when the size changes
  useEffect(() => {
    forceUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideSidebar]);

  return (<>
    <button
      className='h-full text-center hidden xl:block'
      onClick={() => setHideSidebar(hide => !hide)}
      style={{
        backgroundColor: 'var(--bg-color-3)',
        width: 10,
      }}
    >
      {hideSidebar ? '<' : '>'}
    </button>
    {!hideSidebar &&
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
    }
  </>);
}
