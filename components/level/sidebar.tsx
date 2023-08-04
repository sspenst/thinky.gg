import React from 'react';
import Level from '../../models/db/level';
import FormattedLevelInfo from './info/formattedLevelInfo';

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
      <FormattedLevelInfo level={level} />
    </div>
  );
}
