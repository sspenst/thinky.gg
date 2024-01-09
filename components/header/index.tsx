import { Menu, Transition } from '@headlessui/react';
import { GameType } from '@root/constants/Games';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import Image from 'next/image';
import Link from 'next/link';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import LinkInfo from '../formatted/linkInfo';
import Nav from '../nav';
import LoadingSpinner from '../page/loadingSpinner';
import StyledTooltip from '../page/styledTooltip';
import Directory from './directory';
import Dropdown from './dropdown';
import HeaderControls from './headerControls';

interface HeaderProps {
  folders?: LinkInfo[];
  isFullScreen?: boolean;
  subtitle?: LinkInfo;
  title?: LinkInfo;
}

export default function Header({
  folders,
  isFullScreen,
  subtitle,
  title,
}: HeaderProps) {
  const [background, setBackground] = useState<string>();
  const { deviceInfo, game, setShowNav, user } = useContext(AppContext);
  const isNavDropdown = deviceInfo.screenSize < ScreenSize.XL || isFullScreen;

  useEffect(() => {
    if (!window.location.hostname.includes('thinky.gg')) {
      setBackground('linear-gradient(45deg, darkred 20%, var(--bg-color-2) 20%, var(--bg-color-2) 40%, var(--bg-color) 40%, var(--bg-color) 60%, var(--bg-color-2) 60%, var(--bg-color-2) 80%, var(--bg-color) 80%, var(--bg-color) 100%');
    }
  }, []);

  return (
    <header
      className='select-none shadow-md w-full fixed top-0 z-20 flex justify-between px-4 gap-4 border-color-2 border-b bg-1'
      style={{
        background: background,
        height: Dimensions.MenuHeight,
        minHeight: Dimensions.MenuHeight,
      }}
    >
      <div className='flex items-center truncate z-20 gap-4'>
        {game.isNotAGame ? null :
          isNavDropdown ?
            <Menu>
              <Menu.Button className='w-full'>
                <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
                </svg>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter='transition ease-out duration-100'
                enterFrom='transform opacity-0 scale-95'
                enterTo='transform opacity-100 scale-100'
                leave='transition ease-in duration-75'
                leaveFrom='transform opacity-100 scale-100'
                leaveTo='transform opacity-0 scale-95'
              >
                <Menu.Items
                  className='fixed left-0 m-1 z-10 origin-top rounded-[10px] shadow-lg border overflow-y-auto border-color-3'
                  style={{
                  // NB: hardcoded value accounting for header + menu margin
                    maxHeight: 'calc(100% - 56px)',
                    top: Dimensions.MenuHeight,
                  }}
                >
                  <Menu.Item>
                    <Nav isDropdown />
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
            :
            <button onClick={() => setShowNav(showNav => !showNav)}>
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            </button>
        }
        <div>
          <Link className='font-bold text-3xl' href='/'>
            <Image alt='logo' src={game.logo} width='24' height='24' className='h-6 w-6' style={{ minWidth: 24, minHeight: 24 }} />
          </Link>
        </div>
        <div className='-ml-2'>
          <Directory folders={folders} subtitle={subtitle} title={title} />
        </div>
      </div>
      {user === undefined ?
        <div className='flex items-center'>
          <LoadingSpinner />
        </div>
        :
        <div className='flex gap-4 items-center z-20'>
          <HeaderControls />
          {user && <div className='hidden sm:block h-6 w-px bg-neutral-500' />}
          <div className='flex gap-3 items-center'>
            {user && !game.isNotAGame && <>
              {!game.disableRanked && <>
                <Link
                  className='hidden sm:block'
                  data-tooltip-content='Ranked Solves'
                  data-tooltip-id='ranked-solves-header'
                  href='/ranked'
                >
                  <span className='font-bold leading-none'>{user.config.calcRankedSolves} 🏅</span>
                  <StyledTooltip id='ranked-solves-header' />
                </Link>
                <div className='hidden sm:block h-6 w-px bg-neutral-500 mr-1' />
              </>}
              <Link
                className='hidden sm:block mr-1'
                data-tooltip-content={game.type === GameType.COMPLETE_AND_SHORTEST ? 'Levels Completed' : 'Levels Solved'}
                data-tooltip-id='levels-solved-header'
                href='/users'
              >
                <span className='font-bold'>{game.type === GameType.COMPLETE_AND_SHORTEST ? user.config.calcLevelsCompletedCount : user.config.calcLevelsSolvedCount}</span>
                <StyledTooltip id='levels-solved-header' />
              </Link>
            </>}
            {user === null &&
              <div className='hidden sm:flex gap-3'>
                <Link
                  className='hover:underline'
                  href='/login'
                  onClick={() => {
                    sessionStorage.clear();
                  }}
                >
                  Log In
                </Link>
                <Link href='/signup' className='hover:underline'>
                  Sign Up
                </Link>
              </div>
            }
            <Dropdown />
          </div>
        </div>
      }
    </header>
  );
}
