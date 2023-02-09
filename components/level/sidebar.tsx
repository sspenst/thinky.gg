import React, { useContext } from 'react';
import { LevelContext } from '../../contexts/levelContext';
import Level from '../../models/db/level';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

interface SidebarProps {
  level: Level;
}

export default function Sidebar({ level }: SidebarProps) {
  const levelContext = useContext(LevelContext);

  return (
    <div
      className='border-l p-4 break-words hidden xl:block z-10 h-full w-100 overflow-y-scroll'
      style={{
        borderColor: 'var(--bg-color-4)',
      }}
    >
      <FormattedLevelInfo level={level} />
      {!levelContext?.hideReviews && <>
        <div className='m-3' style={{
          backgroundColor: 'var(--bg-color-4)',
          height: 1,
        }} />
        <FormattedLevelReviews />
      </>}
    </div>
  );
}
