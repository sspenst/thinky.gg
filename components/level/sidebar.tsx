import React from 'react';
import Level from '../../models/db/level';
import FormattedLevelInfo from '../formattedLevelInfo';
import FormattedLevelReviews from '../formattedLevelReviews';

interface SidebarProps {
  level: Level;
}

export default function Sidebar({ level }: SidebarProps) {
  return (
    <div
      className='border-l p-4 break-words hidden xl:block z-10 h-full w-100 overflow-y-scroll'
      style={{
        borderColor: 'var(--bg-color-4)',
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
