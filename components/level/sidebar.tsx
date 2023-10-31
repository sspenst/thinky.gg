import React from 'react';
import Level from '../../models/db/level';
import FormattedLevelInfo from './info/formattedLevelInfo';

interface SidebarProps {
  level: Level;
}

export default function Sidebar({ level }: SidebarProps) {
  return (
    <div className='border-l border-color-4 p-4 break-words z-10 h-full w-100 overflow-y-auto'>
      <FormattedLevelInfo level={level} />
    </div>
  );
}
