import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useState } from 'react';
import AboutModal from '../modal/aboutModal';
import Dimensions from '../../constants/dimensions';
import HelpModal from '../modal/helpModal';
import Link from 'next/link';
import ReviewsModal from '../modal/reviewsModal';
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

const enum Modal {
  About,
  Help,
  Reviews,
  Theme,
}

export default function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [openModal, setOpenModal] = useState<Modal>();
  const router = useRouter();
  const { mutateStats } = useStats();
  const { user, isLoading, mutateUser } = useUser();

  const path = router.asPath.match(/[^/]+/g);
  const isLevelPage = path?.at(0) === 'level';
  const levelId = path?.at(1);

  function closeModal() {
    setOpenModal(undefined);
    setIsOpen(false);
  }

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
        onClick={() => setIsOpen(true)}
        style={{
          height: Dimensions.MenuHeight,
          width: 20,
        }}
      >
        {'≡'}
      </button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog onClose={() => setIsOpen(false)}>
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
                color: 'var(--color)',
                minWidth: 160,
                position: 'absolute',
                right: Dimensions.MenuPadding,
                top: Dimensions.MenuHeight -  1,
              }}
            >
              {isLevelPage ?
                <Setting>
                  <button onClick={() => setOpenModal(Modal.Reviews)}>
                    Reviews
                  </button>
                </Setting>
              : null}
              <Setting>
                <button onClick={() => setOpenModal(Modal.Theme)}>
                  Theme
                </button>
              </Setting>
              <Setting>
                <button onClick={() => setOpenModal(Modal.Help)}>
                  Help
                </button>
              </Setting>
              <Setting>
                <button onClick={() => setOpenModal(Modal.About)}>
                  About
                </button>
              </Setting>
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
          <ReviewsModal closeModal={() => closeModal()} isOpen={openModal === Modal.Reviews} levelId={levelId}/>
          <ThemeModal closeModal={() => closeModal()} isOpen={openModal === Modal.Theme}/>
          <HelpModal closeModal={() => closeModal()} isOpen={openModal === Modal.Help}/>
          <AboutModal closeModal={() => closeModal()} isOpen={openModal === Modal.About}/>
        </Dialog>
      </Transition>
    </div>
  );
}