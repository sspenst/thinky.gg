import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

interface SidebarProps {
  level: Level;
}

export default function Sidebar({ level }: SidebarProps) {
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
      <div className='mb-4'>
        <FormattedLevelInfo level={level} />
      </div>
      <div className='m-3' style={{
        backgroundColor: 'var(--bg-color-4)',
        height: 1,
      }} />
      <FormattedLevelReviews />
    </div>
  );
}
