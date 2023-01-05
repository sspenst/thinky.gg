import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import LinkInfo from '../linkInfo';
import Directory from './directory';
import Dropdown from './dropdown';
import UserInfo from './userInfo';

interface MenuProps {
  folders?: LinkInfo[];
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Menu({
  folders,
  subtitle,
  title,
}: MenuProps) {
  const [background, setBackground] = useState('var(--bg-color-2)');
  const { user, userLoading } = useContext(PageContext);

  useEffect(() => {
    setBackground(window.location.hostname !== 'pathology.gg' ?
      'linear-gradient(45deg, darkred 20%, var(--bg-color-4) 20%, var(--bg-color-4) 40%, var(--bg-color-2) 40%, var(--bg-color-2) 60%, var(--bg-color-4) 60%, var(--bg-color-4) 80%, var(--bg-color-2) 80%, var(--bg-color-2) 100%'
      : 'var(--bg-color-2)');
  }, []);

  return (
    <div
      className='select-none shadow-md w-full z-20 flex justify-between px-4'
      style={{
        background: background,
        borderBottom: '1px solid',
        borderColor: 'var(--bg-color-4)',
        height: Dimensions.MenuHeight,
      }}
    >
      <div className='flex'>
        <div className='cursor-default items-center flex pr-2'>
          <Link className={'font-bold text-3xl'} href={!userLoading && !user ? '/' : '/home'}>
            <svg xmlns='http://www.w3.org/2000/svg' version='1.1' className='h-6 w-6' viewBox='0 0 32 32'>
              <rect x='1' y='1' fill='var(--level-player)' width='14' height='14' />
              <rect x='17' y='1' fill='var(--level-grid)' width='14' height='14' />
              <rect x='17' y='17' fill='var(--level-grid)' width='14' height='14' />
              <rect x='1' y='17' fill='var(--level-grid)' width='14' height='14' />
            </svg>
          </Link>
        </div>
        <Directory folders={folders} subtitle={subtitle} title={title} />
      </div>
      <div className='flex gap-4 items-center'>
        <UserInfo />
        <Dropdown />
      </div>
    </div>
  );
}
