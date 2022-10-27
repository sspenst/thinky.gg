import { Dialog, Transition } from '@headlessui/react';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import { LevelContext } from '../../contexts/levelContext';
import { PageContext } from '../../contexts/pageContext';
import getProfileSlug from '../../helpers/getProfileSlug';
import Avatar from '../avatar';
import AboutModal from '../modal/aboutModal';
import AddLevelModal from '../modal/addLevelModal';
import AuthorNoteModal from '../modal/authorNoteModal';
import LevelInfoModal from '../modal/levelInfoModal';
import ReviewsModal from '../modal/reviewsModal';
import ThemeModal from '../modal/themeModal';
import styles from './Dropdown.module.css';

interface SettingProps {
  children: JSX.Element;
  icon: JSX.Element;
  onClick?: () => void;
}

function Setting({ children, icon, onClick }: SettingProps) {
  return (
    <div onClick={onClick} className={classNames('flex flex-cols-2 items-center cursor-pointer py-2.5 px-4', styles['div'])}>
      <div className='mr-3'>
        {icon}
      </div>
      {children}
    </div>
  );
}

const enum Modal {
  About,
  AddLevelToCollection,
  AuthorNote,
  LevelInfo,
  Reviews,
  Theme,
}

export default function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const { mutateUser, setShouldAttemptAuth, user, userLoading } = useContext(AppContext);
  const [openModal, setOpenModal] = useState<Modal | undefined>();
  const router = useRouter();
  const { setPreventKeyDownEvent } = useContext(PageContext);

  useEffect(() => {
    setPreventKeyDownEvent(isOpen);
  }, [isOpen, setPreventKeyDownEvent]);

  function closeModal() {
    setOpenModal(undefined);
    setIsOpen(false);
  }

  function logOut() {
    fetch('/api/logout', {
      method: 'POST',
    }).then(() => {
      // clear sessionStorage and localStorage
      localStorage.clear();
      sessionStorage.clear();
      mutateUser();
      setShouldAttemptAuth(false);
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
      {user ?
        <button
          onClick={() => setIsOpen(true)}
          style={{
            height: Dimensions.MenuHeight,
          }}
        >
          <Avatar size={Dimensions.AvatarSize} user={user} />
        </button>
        :
        <button
          onClick={() => setIsOpen(true)}
          style={{
            height: Dimensions.MenuHeight,
            width: 20,
          }}
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
          </svg>
        </button>
      }
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
                position: 'absolute',
                right: Dimensions.MenuPadding,
                // minus 1 to overlap the menu border
                top: Dimensions.MenuHeight - 1,
              }}
            >
              {levelContext?.level &&
                <div className='block xl:hidden'>
                  {levelContext.level.authorNote ?
                    <Setting onClick={() => setOpenModal(Modal.AuthorNote)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                    </svg>}>
                      <button>
                        Author Note
                      </button>
                    </Setting>
                    : null}
                  <Setting onClick={() => setOpenModal(Modal.LevelInfo)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-info-lg' viewBox='0 0 16 16'>
                    <path d='m9.708 6.075-3.024.379-.108.502.595.108c.387.093.464.232.38.619l-.975 4.577c-.255 1.183.14 1.74 1.067 1.74.72 0 1.554-.332 1.933-.789l.116-.549c-.263.232-.65.325-.905.325-.363 0-.494-.255-.402-.704l1.323-6.208Zm.091-2.755a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0Z' />
                  </svg>}>
                    <button>
                      Level Info
                    </button>
                  </Setting>
                  <Setting onClick={() => setOpenModal(Modal.Reviews)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' />
                  </svg>}>
                    <button>
                      Reviews
                    </button>
                  </Setting>
                </div>
              }
              {!userLoading && user && levelContext?.level && (
                <>
                  <Setting onClick={() => setOpenModal(Modal.AddLevelToCollection)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-plus' viewBox='0 0 16 16'>
                    <path d='M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z' />
                  </svg>}>
                    <button>
                      {levelContext.level.userId._id === user?._id || levelContext.level.userId === user?._id ? 'Edit Level' : 'Add to...'}
                    </button>
                  </Setting>
                </>
              )}
              <Setting onClick={() => setOpenModal(Modal.Theme)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-eyeglasses' viewBox='0 0 16 16'>
                <path d='M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z' />
              </svg>}>
                <button>
                  Theme
                </button>
              </Setting>
              <Setting onClick={() => setOpenModal(Modal.About)} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-info-lg' viewBox='0 0 16 16'>
                <path d='m9.708 6.075-3.024.379-.108.502.595.108c.387.093.464.232.38.619l-.975 4.577c-.255 1.183.14 1.74 1.067 1.74.72 0 1.554-.332 1.933-.789l.116-.549c-.263.232-.65.325-.905.325-.363 0-.494-.255-.402-.704l1.323-6.208Zm.091-2.755a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0Z' />
              </svg>}>
                <button>
                  About
                </button>
              </Setting>
              {!userLoading && user &&
                <>
                  <Link href={getProfileSlug(user)} passHref>
                    <Setting icon={
                      <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-person-fill' viewBox='0 0 16 16'>
                        <path d='M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' />
                      </svg>
                    }>
                      <>Profile</>
                    </Setting>
                  </Link>
                  <Link href='/settings' passHref>
                    <Setting icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-gear' viewBox='0 0 16 16'>
                      <path d='M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z' />
                      <path d='M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z' />
                    </svg>}>
                      <>Settings</>
                    </Setting>
                  </Link>
                  <Setting onClick={logOut} icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-box-arrow-left' viewBox='0 0 16 16'>
                    <path fillRule='evenodd' d='M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z' />
                    <path fillRule='evenodd' d='M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z' />
                  </svg>}>
                    <button>
                      Log Out
                    </button>
                  </Setting>
                </>
              }
            </div>
          </Transition.Child>
          {levelContext?.level ?
            <>
              {levelContext.level.authorNote ?
                <AuthorNoteModal
                  authorNote={levelContext.level.authorNote}
                  closeModal={() => closeModal()}
                  isOpen={openModal === Modal.AuthorNote}
                />
                : null}
              <LevelInfoModal
                closeModal={() => closeModal()}
                isOpen={openModal === Modal.LevelInfo}
                level={levelContext.level}
              />
              <ReviewsModal
                closeModal={() => closeModal()}
                isOpen={openModal === Modal.Reviews}
              />
            </>
            : null}
          <AddLevelModal
            closeModal={() => closeModal()}
            collections={levelContext?.collections}
            isOpen={openModal === Modal.AddLevelToCollection}
            level={levelContext?.level}
          />
          <ThemeModal closeModal={() => closeModal()} isOpen={openModal === Modal.Theme} />
          <AboutModal closeModal={() => closeModal()} isOpen={openModal === Modal.About} />
        </Dialog>
      </Transition>
    </div>
  );
}
