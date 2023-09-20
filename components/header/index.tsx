import { HeaderContext } from '@root/contexts/headerContext';
import { HeaderProvider } from '@root/contexts/headerProvider';
import Image from 'next/image';
import Link from 'next/link';
import React, { createRef, useContext, useEffect, useRef, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import AudioPlayer from '../audioPlayer';
import LinkInfo from '../formatted/linkInfo';
import Directory from './directory';
import Dropdown from './dropdown';
import UserInfo from './userInfo';

interface HeaderProps {
  folders?: LinkInfo[];
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Header({
  folders,
  subtitle,
  title,
}: HeaderProps) {
  const [background, setBackground] = useState('var(--bg-color-2)');
  const { user, userLoading } = useContext(AppContext);

  useEffect(() => {
    setBackground(window.location.hostname !== 'pathology.gg' ?
      'linear-gradient(45deg, darkred 20%, var(--bg-color-4) 20%, var(--bg-color-4) 40%, var(--bg-color-2) 40%, var(--bg-color-2) 60%, var(--bg-color-4) 60%, var(--bg-color-4) 80%, var(--bg-color-2) 80%, var(--bg-color-2) 100%'
      : 'var(--bg-color-2)');
  }, []);

  return (

    <header
      className='select-none shadow-md w-full flex justify-between px-4 gap-4'
      style={{
        background: background,
        borderBottom: '1px solid',
        borderColor: 'var(--bg-color-4)',
        height: Dimensions.MenuHeight,
        minHeight: Dimensions.MenuHeight,
      }}
    >
      <div className='flex truncate'>
        <div className='cursor-default items-center flex pr-2'>
          <Link className={'font-bold text-3xl'} href={!userLoading && !user ? '/' : '/home'}>
            <Image alt='logo' src='/logo.svg' width='24' height='24' className='h-6 w-6' style={{ minWidth: 24, minHeight: 24 }} />
          </Link>
        </div>
        <Directory folders={folders} subtitle={subtitle} title={title} />
      </div>
      <div className='flex gap-4 items-center z-20'>
        <AudioPlayer />

        <UserInfo />
        <Dropdown />
      </div>
    </header>

  );
}
