import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import AboutModal from '../modal/aboutModal';
import AuthorNoteModal from '../modal/authorNoteModal';
import Dimensions from '../../constants/dimensions';
import HelpModal from '../modal/helpModal';
import Level from '../../models/db/level';
import LevelInfoModal from '../modal/levelInfoModal';
import Link from 'next/link';
import { PageContext } from '../../contexts/pageContext';
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
  AuthorNote,
  Help,
  LevelInfo,
  Reviews,
  Theme,
}

interface DropdownProps {
  level?: Level;
}

export default function Dropdown({ level }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openModal, setOpenModal] = useState<Modal | undefined>();
  const router = useRouter();
  const { setIsModalOpen } = useContext(PageContext);
  const { mutateStats } = useStats();
  const { user, isLoading, mutateUser } = useUser();

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen, setIsModalOpen]);

  useEffect(() => {
    if (level && level.authorNote) {
      setIsOpen(true);
      setOpenModal(Modal.AuthorNote);
    }
  }, [level]);

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
        onClick={() => setIsOpen(true)}
        style={{
          height: Dimensions.MenuHeight,
          width: 20,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as='div'
          className='fixed inset-0 z-10 overflow-y-auto'
          onClose={() => setIsOpen(false)}
        >
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
                top: Dimensions.MenuHeight - 1,
              }}
            >
              {level ?
                <>
                  {level.authorNote ?
                    <Setting>
                      <button onClick={() => setOpenModal(Modal.AuthorNote)}>
                        Author Note
                      </button>
                    </Setting>
                    : null}
                  <Setting>
                    <button onClick={() => setOpenModal(Modal.LevelInfo)}>
                      Level Info
                    </button>
                  </Setting>
                  <Setting>
                    <button onClick={() => setOpenModal(Modal.Reviews)}>
                      Reviews
                    </button>
                  </Setting>
                </>
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
          {level ?
            <>
              {level.authorNote ?
                <AuthorNoteModal
                  authorNote={level.authorNote}
                  closeModal={() => closeModal()}
                  isOpen={openModal === Modal.AuthorNote}
                />
                : null}
              <LevelInfoModal
                closeModal={() => closeModal()}
                isOpen={openModal === Modal.LevelInfo}
                level={level}
              />
              <ReviewsModal
                closeModal={() => closeModal()}
                isOpen={openModal === Modal.Reviews}
                levelId={level._id.toString()}
              />
            </>
            : null}
          <ThemeModal closeModal={() => closeModal()} isOpen={openModal === Modal.Theme}/>
          <HelpModal closeModal={() => closeModal()} isOpen={openModal === Modal.Help}/>
          <AboutModal closeModal={() => closeModal()} isOpen={openModal === Modal.About}/>
        </Dialog>
      </Transition>
    </div>
  );
}
