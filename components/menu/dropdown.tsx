import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import HelpModal from '../modal/helpModal';
import Link from 'next/link';
import ThemeModal from '../modal/themeModal';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface SettingProps {
  children: JSX.Element;
}

function Setting({ children }: SettingProps) {
  return (
    <div
      style={{
        padding: Dimensions.MenuPadding,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

export default function Dropdown() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const router = useRouter();
  const { mutateStats } = useStats();
  const { user, isLoading, mutateUser } = useUser();

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      mutateStats(undefined);
      mutateUser(undefined);
      router.push('/');
    });
  }

  return (
    <div
      style={{
        float: 'left',
        paddingLeft: Dimensions.MenuPadding,
        paddingRight: Dimensions.MenuPadding * 2,
      }}
    >
      <button
        className={'text-3xl'}
        onClick={() => setShowSettings(true)}
        style={{
          height: Dimensions.MenuHeight,
          width: 20,
        }}
      >
        {'≡'}
      </button>
      <Transition appear show={showSettings} as={Fragment}>
        <Dialog onClose={() => setShowSettings(false)}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-100'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0' />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-100'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div
              className={'shadow-md'}
              style={{
                backgroundColor: 'var(--bg-color-2)',
                borderBottomLeftRadius: 6,
                borderBottomRightRadius: 6,
                borderColor: 'var(--bg-color-4)',
                borderStyle: 'solid',
                borderWidth: '0 1px 1px 1px',
                minWidth: 160,
                position: 'absolute',
                right: Dimensions.MenuPadding,
                top: Dimensions.MenuHeight -  1,
              }}
            >
              <Setting>
                <button onClick={() => setIsThemeOpen(true)}>
                  Theme
                </button>
              </Setting>
              <ThemeModal closeModal={() => setIsThemeOpen(false)} isOpen={isThemeOpen}/>
              <Setting>
                <button onClick={() => setIsHelpOpen(true)}>
                  Help
                </button>
              </Setting>
              <HelpModal closeModal={() => setIsHelpOpen(false)} isOpen={isHelpOpen}/>
              {!isLoading && user ?
                <>
                  <Setting>
                    <Link href='/account'>
                      Account
                    </Link>
                  </Setting>
                  <Setting>
                    <button onClick={logOut}>
                      Log Out
                    </button>
                  </Setting>
                </>
              : null}
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </div>
  );
}