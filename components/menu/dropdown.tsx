import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import AboutModal from '../modal/aboutModal';
import AuthorNoteModal from '../modal/authorNoteModal';
import Avatar from '../avatar';
import Dimensions from '../../constants/dimensions';
import HelpModal from '../modal/helpModal';
import { LevelContext } from '../../contexts/levelContext';
import LevelInfoModal from '../modal/levelInfoModal';
import Link from 'next/link';
import { ObjectId } from 'bson';
import { PageContext } from '../../contexts/pageContext';
import ReviewsModal from '../modal/reviewsModal';
import ThemeModal from '../modal/themeModal';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';
import AddLevelModal from '../modal/addLevelModal';
import useUserById from '../../hooks/useUserById';
import World from '../../models/db/world';

interface SettingProps {
  onClick: () => void;
  icon?: JSX.Element;
  children: JSX.Element;
}

function Setting({ icon, children, onClick }: SettingProps) {
  return (
    <div onClick={onClick} className="hover:bg-gray-700 flex flex-cols-2 items-center"
      style={{
        padding: Dimensions.MenuPadding,
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <div className='mr-3'>
        {icon}
      </div>
      <div className='text-center p-1'>
        {children}
      </div>
    </div>
  );
}

const enum Modal {
  About,
  AddLevelToCollection,
  AuthorNote,
  Help,
  LevelInfo,
  Reviews,
  Theme,
}

export default function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const levelContext = useContext(LevelContext);
  const [levelId, setLevelId] = useState<ObjectId>();
  const [openModal, setOpenModal] = useState<Modal | undefined>();
  const router = useRouter();
  const { setIsModalOpen, showSidebar } = useContext(PageContext);
  const { mutateStats } = useStats();
  const { user, isLoading, mutateUser } = useUser();
  const [worlds, setWorlds] = useState<World[]>();

  const getWorlds = useCallback(() => {
    fetch('/api/worlds', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setWorlds(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching worlds');
    });
  }, []);

  useEffect(() => {
    getWorlds();
  }, [getWorlds]);
  const hasSidebar = useHasSidebarOption() && showSidebar;

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen, setIsModalOpen]);

  useEffect(() => {
    if (!levelContext?.level) {
      return;
    }

    const level = levelContext.level;

    if (!hasSidebar && level._id !== levelId && level.authorNote) {
      setIsOpen(true);
      setOpenModal(Modal.AuthorNote);
    }

    // NB: once the level has loaded, we don't want to popup the author note
    // when the sidebar is closed or the level updates with SWR
    setLevelId(level._id);
  }, [hasSidebar, levelContext?.level, levelId]);

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
      {user ?
        <button
          onClick={() => setIsOpen(true)}
          style={{
            height: Dimensions.MenuHeight,
          }}
        >
          <Avatar size={Dimensions.AvatarSize} user={user}/>
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
                top: Dimensions.MenuHeight,
              }}
            >
              {levelContext?.level && !hasSidebar ?
                <>
                  {levelContext.level.authorNote ?
                    <Setting onClick={() => setOpenModal(Modal.AuthorNote)}>
                      <button>
                        Author Note
                      </button>
                    </Setting>
                    : null}
                  <Setting onClick={() => setOpenModal(Modal.LevelInfo)}>
                    <button >
                      Level Info
                    </button>
                  </Setting>
                  <Setting onClick={() => setOpenModal(Modal.Reviews)}>
                    <button >
                      Reviews
                    </button>
                  </Setting>
                </>
                : null}

              <Setting onClick={() => setOpenModal(Modal.About)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-lg" viewBox="0 0 16 16">
                <path d="m9.708 6.075-3.024.379-.108.502.595.108c.387.093.464.232.38.619l-.975 4.577c-.255 1.183.14 1.74 1.067 1.74.72 0 1.554-.332 1.933-.789l.116-.549c-.263.232-.65.325-.905.325-.363 0-.494-.255-.402-.704l1.323-6.208Zm.091-2.755a1.32 1.32 0 1 1-2.64 0 1.32 1.32 0 0 1 2.64 0Z"/>
              </svg>}>
                <button>
                  About
                </button>
              </Setting>
              {levelContext?.level && (
                <>
                  <Setting onClick={() => {
                    setOpenModal(Modal.AddLevelToCollection);
                  }
                  } icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>}>
                    <button>
                      {levelContext.level.userId._id === user?._id || levelContext.level.userId === user?._id ? 'Edit Level' : 'Add to...'}
                    </button>
                  </Setting>
                  <Setting onClick={() => setOpenModal(Modal.Theme)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eyeglasses" viewBox="0 0 16 16">
                    <path d="M4 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm2.625.547a3 3 0 0 0-5.584.953H.5a.5.5 0 0 0 0 1h.541A3 3 0 0 0 7 8a1 1 0 0 1 2 0 3 3 0 0 0 5.959.5h.541a.5.5 0 0 0 0-1h-.541a3 3 0 0 0-5.584-.953A1.993 1.993 0 0 0 8 6c-.532 0-1.016.208-1.375.547zM14 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                  </svg>}>
                    <button >
                  Theme
                    </button>
                  </Setting>
                </>
              )}
              {!isLoading && user ?
                <>
                  <Setting onClick={()=>{
                    window.location.href = `/profile/${user._id}`;
                  }} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person-fill" viewBox="0 0 16 16">
                      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    </svg>
                  }>
                    <button>
                      Profile
                    </button>
                  </Setting>
                  <Setting onClick={()=>{
                    window.location.href = '/settings';
                  }} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear" viewBox="0 0 16 16">
                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                  </svg>}>
                    <button>
                      Settings
                    </button>
                  </Setting>
                  <Setting onClick={logOut} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-box-arrow-left" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z"/>
                    <path fillRule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z"/>
                  </svg>}>
                    <button>
                      Log Out
                    </button>
                  </Setting>
                </>
                : null}
            </div>
          </Transition.Child>
          {levelContext?.level && !hasSidebar ?
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
            isOpen={openModal === Modal.AddLevelToCollection}
            level={levelContext?.level}
            worlds={worlds}
          />
          <ThemeModal closeModal={() => closeModal()} isOpen={openModal === Modal.Theme}/>
          <HelpModal closeModal={() => closeModal()} isOpen={openModal === Modal.Help}/>
          <AboutModal closeModal={() => closeModal()} isOpen={openModal === Modal.About}/>
        </Dialog>
      </Transition>
    </div>
  );
}
