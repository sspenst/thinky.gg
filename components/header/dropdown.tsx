import { Menu, Transition } from '@headlessui/react';
import isGuest from '@root/helpers/isGuest';
import isPro from '@root/helpers/isPro';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import getProfileSlug from '../../helpers/getProfileSlug';
import EditLevelModal from '../modal/editLevelModal';
import ThemeModal from '../modal/themeModal';
import ProfileAvatar from '../profile/profileAvatar';
import DismissToast from '../toasts/dismissToast';

const enum Modal {
  AddLevelToCollection,
  Theme,
}

export default function Dropdown() {
  const { forceUpdate, mutateUser, user, userLoading } = useContext(AppContext);
  const levelContext = useContext(LevelContext);
  const [openModal, setOpenModal] = useState<Modal | undefined>();
  const router = useRouter();
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { setShouldAttemptAuth } = useContext(AppContext);

  useEffect(() => {
    setPreventKeyDownEvent(openModal !== undefined);
  }, [openModal, setPreventKeyDownEvent]);

  function closeModal() {
    setOpenModal(undefined);
  }

  function logOutToast() {
    toast.dismiss();
    toast.error(
      <div className='flex'>
        <div className='flex flex-col gap-3 justify-center items-center'>
          <span className='text-lg font-bold text-center'>Are you sure you want to log out?</span>
          <span className='text-sm text-center'>Unless you saved the generated password for your Guest account, <span className='font-bold'>you will lose your progress!</span></span>
          <Link className='text-white font-medium rounded-lg text-sm py-2.5 px-3.5 text-center transition bg-green-600 hover:bg-green-700' href='/settings/account' onClick={() => toast.dismiss()}>Convert to a (free) regular account</Link>
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
      forceUpdate();
    });
  }

  return (<>
    <Menu>
      <Menu.Button id='dropdownMenuBtn' aria-label='dropdown menu'>
        {user ?
          <ProfileAvatar user={user} />
          :
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
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
        <Menu.Items className='absolute right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border' style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
          color: 'var(--color)',
          top: Dimensions.MenuHeight,
        }}>
          <div className='px-1 py-1'>
            {user && levelContext &&
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                    onClick={() => setOpenModal(Modal.AddLevelToCollection)}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' height='16' width='16'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
                    </svg>
                    {levelContext.level.userId._id === user._id || levelContext.level.userId === user._id ? 'Edit Level' : 'Add to...'}
                  </div>
                )}
              </Menu.Item>
            }
            <Menu.Item>
              {({ active }) => (
                <div
                  className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                  onClick={() => setOpenModal(Modal.Theme)}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='bi bi-plus' width='16' height='16'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z' />
                  </svg>
                  Theme
                </div>
              )}
            </Menu.Item>
            {!userLoading && user && <>
              {!isPro(user) &&
                <Menu.Item>
                  {({ active }) => (
                    <Link href='/settings/proaccount' passHref>
                      <div
                        className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <Image alt='pro' src='/pro.svg' width='16' height='16' />
                        Pathology Pro
                      </div>
                    </Link>
                  )}
                </Menu.Item>
              }
              <Menu.Item>
                {({ active }) => (
                  <Link href={getProfileSlug(user)} passHref>
                    <div
                      className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                      style={{
                        backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-person-fill' viewBox='0 0 16 16'>
                        <path d='M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' />
                      </svg>
                      Profile
                    </div>
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link href='/play-history' passHref>
                    <div
                      className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                      style={{
                        backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-clock-history' viewBox='0 0 16 16'>
                        <path d='M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z' />
                        <path d='M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z' />
                        <path d='M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z' />
                      </svg>
                      Play History<Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
                    </div>
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link href='/settings' passHref>
                    <div
                      className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                      style={{
                        backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                      }}
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-gear' viewBox='0 0 16 16'>
                        <path d='M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z' />
                        <path d='M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z' />
                      </svg>
                      Settings
                    </div>
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3'
                    onClick={isGuest(user) ? logOutToast : logOut}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-box-arrow-left' viewBox='0 0 16 16'>
                      <path fillRule='evenodd' d='M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z' />
                      <path fillRule='evenodd' d='M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z' />
                    </svg>
                    Log Out
                  </div>
                )}
              </Menu.Item>
            </>}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
    {levelContext &&
      <EditLevelModal
        closeModal={() => closeModal()}
        isOpen={openModal === Modal.AddLevelToCollection}
        level={levelContext.level}
      />
    }
    <ThemeModal closeModal={() => closeModal()} isOpen={openModal === Modal.Theme} />
  </>);
}
