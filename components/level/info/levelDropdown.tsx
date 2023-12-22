import { Menu, Transition } from '@headlessui/react';
import ArchiveLevelModal from '@root/components/modal/archiveLevelModal';
import DeleteLevelModal from '@root/components/modal/deleteLevelModal';
import EditLevelModal from '@root/components/modal/editLevelModal';
import PublishLevelModal from '@root/components/modal/publishLevelModal';
import SaveToCollectionModal from '@root/components/modal/saveToCollectionModal';
import UnpublishLevelModal from '@root/components/modal/unpublishLevelModal';
import { AppContext } from '@root/contexts/appContext';
import { PageContext } from '@root/contexts/pageContext';
import isCurator from '@root/helpers/isCurator';
import Level from '@root/models/db/level';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Fragment, useContext, useState } from 'react';
import toast from 'react-hot-toast';

interface LevelDropdownProps {
  level: Level;
}

export default function LevelDropdown({ level }: LevelDropdownProps) {
  const [isArchiveLevelOpen, setIsArchiveLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isPlayLaterLoading, setIsPlayLaterLoading] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isSaveToCollectionOpen, setIsSaveToCollectionOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const { mutatePlayLater, playLater, user } = useContext(AppContext);
  const { setPreventKeyDownEvent } = useContext(PageContext);

  const isAuthor = level.userId === user?._id || level.userId._id === user?._id;
  const canEdit = isAuthor || isCurator(user);
  const boldedLevelName = <span className='font-bold'>{level.name}</span>;
  const isInPlayLater = !!(playLater && playLater[level._id.toString()]);

  const fetchPlayLater = async (remove: boolean) => {
    if (!user) {
      return;
    }

    setIsPlayLaterLoading(true);
    toast.dismiss();
    toast.loading(remove ? 'Removing...' : 'Adding...', {
      position: 'bottom-center',
    });

    const res = await fetch('/api/play-later/', {
      method: remove ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: level._id.toString(),
      }),
    });

    toast.dismiss();

    if (res.ok) {
      const message = (
        <div className='flex flex-col items-center w-92 max-w-full text-center'>
          <span>{remove ? ['Removed ', boldedLevelName, ' from'] : ['Added ', boldedLevelName, ' to']} <Link className='underline' href={`/collection/${user.name}/play-later`}>Play Later</Link></span>
          <button className='text-sm underline' onClick={() => fetchPlayLater(!remove)}>Undo</button>
        </div>
      );

      toast.success(message, {
        duration: 5000,
        position: 'bottom-center',
        icon: remove ? '➖' : '➕',
      });
      mutatePlayLater();
    } else {
      let resp;

      try {
        resp = await res.json();
      } catch (e) {
        console.error(e);
      }

      toast.error(resp?.error || 'Could not update Play Later', {
        duration: 5000,
        position: 'bottom-center',
      });
    }

    setIsPlayLaterLoading(false);
  };

  return (<>
    <Menu as='div' className='relative'>
      <Menu.Button className='flex items-center' id='dropdownMenuBtn' aria-label='dropdown menu'>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6 hover:opacity-100 opacity-50' style={{ minWidth: 24, minHeight: 24 }}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
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
        <Menu.Items className='absolute right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border z-20 bg-1 border-color-3'>
          <div className='px-1 py-1'>
            {user && <>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                    disabled={isPlayLaterLoading}
                    onClick={() => fetchPlayLater(isInPlayLater)}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    {isInPlayLater ?
                      <>
                        <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                          <path d='M11 2C7.22876 2 5.34315 2 4.17157 3.12874C3 4.25748 3 6.07416 3 9.70753V17.9808C3 20.2867 3 21.4396 3.77285 21.8523C5.26947 22.6514 8.0768 19.9852 9.41 19.1824C10.1832 18.7168 10.5698 18.484 11 18.484C11.4302 18.484 11.8168 18.7168 12.59 19.1824C13.9232 19.9852 16.7305 22.6514 18.2272 21.8523C19 21.4396 19 20.2867 19 17.9808V11' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                          <path d='M13 6L21 6' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                        </svg>
                        <span>Remove from Play Later</span>
                      </>
                      :
                      <>
                        <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                          <path d='M11 2C7.22876 2 5.34315 2 4.17157 3.12874C3 4.25748 3 6.07416 3 9.70753V17.9808C3 20.2867 3 21.4396 3.77285 21.8523C5.26947 22.6514 8.0768 19.9852 9.41 19.1824C10.1832 18.7168 10.5698 18.484 11 18.484C11.4302 18.484 11.8168 18.7168 12.59 19.1824C13.9232 19.9852 16.7305 22.6514 18.2272 21.8523C19 21.4396 19 20.2867 19 17.9808V13' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                          <path d='M17 10L17 2M13 6H21' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                        </svg>
                        <span>Add to Play Later</span>
                      </>
                    }
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                    onClick={() => {
                      setIsSaveToCollectionOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
                    </svg>
                    <span>Save to collection</span>
                  </div>
                )}
              </Menu.Item>
            </>}
            <Menu.Item>
              {({ active }) => (
                <div
                  className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                  onClick={() => {
                    navigator.clipboard.writeText(level.data);
                    toast.dismiss();
                    toast.success('Level data copied to clipboard');
                  }}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z' />
                  </svg>
                  <span>Copy level data</span>
                </div>
              )}
            </Menu.Item>
            {!level.isDraft &&
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/level/${level.slug}`);
                      toast.dismiss();
                      toast.success('Link copied to clipboard');
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' />
                    </svg>
                    <span>Share link</span>
                  </div>
                )}
              </Menu.Item>
            }
            {canEdit && <>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                    onClick={() => {
                      setIsEditLevelOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' viewBox='1 1 22 22' strokeWidth='1.5' stroke='currentColor' fill='none' strokeLinecap='round' strokeLinejoin='round'>
                      <path stroke='none' d='M0 0h24v24H0z' fill='none' />
                      <path d='M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4' />
                      <path d='M13.5 6.5l4 4' />
                    </svg>
                    <span>Edit</span>
                  </div>
                )}
              </Menu.Item>
              {level.isDraft ?
                <>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                        href={`/test/${level._id.toString()}`}
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='1 1 22 22' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z' />
                        </svg>
                        <span>Test</span>
                      </Link>
                    )}
                  </Menu.Item>
                  {level.leastMoves !== 0 &&
                    <Menu.Item>
                      {({ active }) => (
                        <div
                          className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                          onClick={() => {
                            setIsPublishLevelOpen(true);
                            setPreventKeyDownEvent(true);
                          }}
                          style={{
                            backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                          }}
                        >
                          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5' />
                          </svg>
                          <span>Publish</span>
                        </div>
                      )}
                    </Menu.Item>
                  }
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                        onClick={() => {
                          setIsDeleteLevelOpen(true);
                          setPreventKeyDownEvent(true);
                        }}
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' />
                        </svg>
                        <span>Delete</span>
                      </div>
                    )}
                  </Menu.Item>
                </>
                :
                <>
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                        onClick={() => {
                          setIsArchiveLevelOpen(true);
                          setPreventKeyDownEvent(true);
                        }}
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' />
                        </svg>
                        <span>Archive</span>
                      </div>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': !isAuthor })}
                        onClick={() => {
                          setIsUnpublishLevelOpen(true);
                          setPreventKeyDownEvent(true);
                        }}
                        style={{
                          backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                        }}
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' />
                        </svg>
                        <span>Unpublish</span>
                      </div>
                    )}
                  </Menu.Item>
                </>
              }
            </>}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
    {user &&
      <SaveToCollectionModal
        closeModal={() => {
          setIsSaveToCollectionOpen(false);
          setPreventKeyDownEvent(false);
        }}
        isOpen={isSaveToCollectionOpen}
        level={level}
      />
    }
    {canEdit && <>
      <EditLevelModal
        closeModal={() => {
          setIsEditLevelOpen(false);
          setPreventKeyDownEvent(false);
        }}
        isOpen={isEditLevelOpen}
        level={level}
      />
      {level.isDraft ?
        <>
          <PublishLevelModal
            closeModal={() => {
              setIsPublishLevelOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isPublishLevelOpen}
            level={level}
          />
          <DeleteLevelModal
            closeModal={() => {
              setIsDeleteLevelOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isDeleteLevelOpen}
            level={level}
          />
        </>
        :
        <>
          <ArchiveLevelModal
            closeModal={() => {
              setIsArchiveLevelOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isArchiveLevelOpen}
            level={level}
          />
          <UnpublishLevelModal
            closeModal={() => {
              setIsUnpublishLevelOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isUnpublishLevelOpen}
            level={level}
          />
        </>
      }
    </>}
  </>);
}
