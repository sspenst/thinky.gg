import { ScreenSize } from '@root/hooks/useDeviceCheck';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import LinkInfo from '../formatted/linkInfo';
import StyledTooltip from '../page/styledTooltip';
import Directory from './directory';
import Dropdown from './dropdown';
import { GameMenu } from './gameMenu';
import HeaderControls from './headerControls';

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
  const { deviceInfo, user, userLoading } = useContext(AppContext);

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
        { deviceInfo.screenSize > ScreenSize.XS && <GameMenu />}
        <HeaderControls />
        {user && <div className='hidden sm:block h-6 w-px bg-neutral-500' />}
        <div className='flex gap-3 items-center'>
          {user && <>
            <Link
              className='hidden sm:block'
              data-tooltip-content='Ranked Solves'
              data-tooltip-id='ranked-solves-header'
              href='/ranked'
            >
              <span className='font-bold leading-none'>{user.config.calcRankedSolves} 🏅</span>
              <StyledTooltip id='ranked-solves-header' />
            </Link>
            <div className='hidden sm:block h-6 w-px bg-neutral-500' />
            <Link
              className='hidden sm:block ml-1'
              data-tooltip-content='Levels Solved'
              data-tooltip-id='levels-solved-header'
              href='/users'
            >
              <span className='font-bold'>{user.config.calcLevelsSolvedCount}</span>
              <StyledTooltip id='levels-solved-header' />
            </Link>
          </>}
          <Dropdown />
        </div>
      </div>
    </header>
  );
}
