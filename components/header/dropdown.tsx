import { Menu, Transition } from '@headlessui/react';
import { GameType } from '@root/constants/Games';
import isGuest from '@root/helpers/isGuest';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import getProfileSlug from '../../helpers/getProfileSlug';
import MusicModal from '../modal/musicModal';
import ThemeModal from '../modal/themeModal';
import StyledTooltip from '../page/styledTooltip';
import ProfileAvatar from '../profile/profileAvatar';
import DismissToast from '../toasts/dismissToast';
import MusicIcon from './musicIcon';

export default function Dropdown() {
  const { forceUpdate, game, mutateUser, setShouldAttemptAuth, user } = useContext(AppContext);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const router = useRouter();
  const { setPreventKeyDownEvent } = useContext(PageContext);

  function logOutToast() {
    toast.dismiss();
    toast.error(
      <div className='flex'>
        <div className='flex flex-col gap-3 justify-center items-center'>
          <span className='text-lg font-bold text-center'>Are you sure you want to log out?</span>
          <span className='text-sm text-center'>Unless you saved the generated password for your Guest account, <span className='font-bold'>you will lose your progress!</span></span>
          <Link className='text-white font-medium rounded-lg text-sm py-2.5 px-3.5 text-center transition bg-green-600 hover:bg-green-700' href='/settings' onClick={() => toast.dismiss()}>Convert to a (free) regular account</Link>
          <button className='text-white font-medium rounded-lg text-sm py-2.5 px-3.5 text-center transition bg-red-600 hover:bg-red-700' onClick={logOut}>Proceed with logging out</button>
        </div>
        <DismissToast />
      </div>,
      {
        duration: 30000,
        icon: '⚠️',
      },
    );
  }

  function logOut() {
    toast.dismiss();
    toast.loading('Logging out...', { duration: 1000 });
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      localStorage.clear();
      sessionStorage.clear();
      mutateUser(undefined);
      setShouldAttemptAuth(false);
      router.push('/');
      router.reload();
      forceUpdate();
    });
  }

  function Divider() {
    return <div className='opacity-30 m-1 h-px bg-4' />;
  }

  return (<>
    <Menu>
      <Menu.Button id='dropdownMenuBtn' aria-label='dropdown menu'>
        {user ?
          <ProfileAvatar user={user} />
          :
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 hover:opacity-70' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
          </svg>
        }
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
        <Menu.Items className='fixed right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border overflow-y-auto bg-1 border-color-3' style={{
          // NB: hardcoded value accounting for header + menu margin
          maxHeight: 'calc(100% - 56px)',
          top: Dimensions.MenuHeight,
        }}>
          <div className='px-1 py-1'>
            {user && <>
              {!game.isNotAGame && <>
                <div className='flex justify-center gap-2 items-center sm:hidden py-1.5 px-3'>
                  {!game.disableRanked && <>
                    <Link
                      className='flex justify-center'
                      data-tooltip-content='Ranked Solves'
                      data-tooltip-id='ranked-solves-dropdown'
                      href='/ranked'
                      id='levelsSolvedBtn'
                    >
                      <span className='font-bold'>{user.config.calcRankedSolves} 🏅</span>
                      <StyledTooltip id='ranked-solves-dropdown' />
                    </Link>
                    <div className='h-6 w-px bg-neutral-500' />
                  </>}
                  <Link
                    className='ml-1'
                    data-tooltip-content={game.type === GameType.COMPLETE_AND_SHORTEST ? 'Levels Completed' : 'Levels Solved'}
                    data-tooltip-id='levels-solves-dropdown'
                    href='/users'
                    id='levelsSolvedBtn'
                  >
                    <span className='font-bold'>{game.type === GameType.COMPLETE_AND_SHORTEST ? user.config.calcLevelsCompletedCount : user.config.calcLevelsSolvedCount}</span>
                    <StyledTooltip id='levels-solves-dropdown' />
                  </Link>
                </div>
                <div className='block sm:hidden'>
                  <Divider />
                </div>
              </>}
              <Menu.Item>
                {({ active }) => (
                  <Link href={getProfileSlug(user)} passHref>
                    <div
                      className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                      style={{
                        backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' />
                      </svg>
                      Profile
                    </div>
                  </Link>
                )}
              </Menu.Item>
              <Divider />
            </>}
            <Menu.Item>
              {({ active }) => (
                <div
                  className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                  onClick={() => {
                    setIsThemeOpen(true);
                    setPreventKeyDownEvent(true);
                  }}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' className='w-5 h-5' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z' />
                  </svg>
                  Theme
                </div>
              )}
            </Menu.Item>
            <div className='block sm:hidden'>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                    onClick={() => {
                      setIsMusicModalOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <MusicIcon />
                    Music
                  </div>
                )}
              </Menu.Item>
            </div>
            {user ?
              <>
                <Menu.Item>
                  {({ active }) => (
                    <Link href='/settings' passHref>
                      <div
                        className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='currentColor' viewBox='0 0 16 16'>
                          <path d='M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z' />
                          <path d='M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z' />
                        </svg>
                        Settings
                      </div>
                    </Link>
                  )}
                </Menu.Item>
                {game.hasPro &&
                  <Menu.Item>
                    {({ active }) => (
                      <Link href='/pro' passHref>
                        <div
                          className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                          style={{
                            backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                          }}
                        >
                          <Image alt='pro' src='/pro.svg' width='20' height='20' />
                          Pro
                        </div>
                      </Link>
                    )}
                  </Menu.Item>
                }
                <Divider />
                <Menu.Item>
                  {({ active }) => (
                    <div
                      className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                      onClick={isGuest(user) ? logOutToast : logOut}
                      style={{
                        backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='currentColor' viewBox='0 0 16 16'>
                        <path fillRule='evenodd' d='M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z' />
                        <path fillRule='evenodd' d='M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z' />
                      </svg>
                      Log Out
                    </div>
                  )}
                </Menu.Item>
              </>
              :
              <div className='block sm:hidden'>
                <Divider />
                <Menu.Item>
                  {({ active }) => (
                    <Link href='/login' onClick={() => sessionStorage.clear()}>
                      <div
                        className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='currentColor' viewBox='0 0 16 16'>
                          <path fillRule='evenodd' d='M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z' />
                          <path fillRule='evenodd' d='M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z' />
                        </svg>
                        Log In
                      </div>
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link href='/signup'>
                      <div
                        className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' />
                        </svg>
                        Sign Up
                      </div>
                    </Link>
                  )}
                </Menu.Item>
              </div>
            }
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
    <ThemeModal
      closeModal={() => {
        setIsThemeOpen(false);
        setPreventKeyDownEvent(false);
      }}
      isOpen={isThemeOpen}
    />
    <MusicModal
      closeModal={() => {
        setIsMusicModalOpen(false);
        setPreventKeyDownEvent(false);
      }}
      isOpen={isMusicModalOpen}
    />
  </>);
}
