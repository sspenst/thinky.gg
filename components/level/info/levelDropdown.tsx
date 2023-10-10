import { Menu, Transition } from '@headlessui/react';
import ArchiveLevelModal from '@root/components/modal/archiveLevelModal';
import EditLevelModal from '@root/components/modal/editLevelModal';
import UnpublishLevelModal from '@root/components/modal/unpublishLevelModal';
import { AppContext } from '@root/contexts/appContext';
import { PageContext } from '@root/contexts/pageContext';
import isCurator from '@root/helpers/isCurator';
import Level from '@root/models/db/level';
import classNames from 'classnames';
import React, { Fragment, useContext, useState } from 'react';
import toast from 'react-hot-toast';

interface LevelDropdownProps {
  level: Level;
}

export default function LevelDropdown({ level }: LevelDropdownProps) {
  const [isArchiveLevelOpen, setIsArchiveLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { user } = useContext(AppContext);

  const canEdit = level.userId._id === user?._id || isCurator(user);
  const isNotAuthor = level.userId._id !== user?._id;

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
        <Menu.Items className='absolute right-0 m-1 w-fit origin-top-right rounded-[10px] shadow-lg border z-20' style={{
          backgroundColor: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
          color: 'var(--color)',
        }}>
          <div className='px-1 py-1'>
            <Menu.Item>
              {({ active }) => (
                <div
                  className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.dismiss();
                    toast.success('Link copied to clipboard');
                  }}
                  style={{
                    backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                  }}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' />
                  </svg>
                  Copy link
                </div>
              )}
            </Menu.Item>
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
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z' />
                  </svg>
                  Copy level data
                </div>
              )}
            </Menu.Item>
            {user &&
              <Menu.Item>
                {({ active }) => (
                  <div
                    className='flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3 whitespace-nowrap'
                    onClick={() => {
                      setIsEditLevelOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    {canEdit ?
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125' />
                      </svg>
                      :
                      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' height='16' width='16'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
                      </svg>
                    }
                    {canEdit ? 'Edit' : 'Add to...'}
                  </div>
                )}
              </Menu.Item>
            }
            {canEdit && <>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': isNotAuthor })}
                    onClick={() => {
                      setIsArchiveLevelOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' />
                    </svg>
                    Archive
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    className={classNames('flex w-full items-center rounded-md cursor-pointer px-3 py-2 gap-3', { 'text-red-500': isNotAuthor })}
                    onClick={() => {
                      setIsUnpublishLevelOpen(true);
                      setPreventKeyDownEvent(true);
                    }}
                    style={{
                      backgroundColor: active ? 'var(--bg-color-3)' : undefined,
                    }}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' />
                    </svg>
                    Unpublish
                  </div>
                )}
              </Menu.Item>
            </>}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
    {user &&
      <EditLevelModal
        closeModal={() => {
          setIsEditLevelOpen(false);
          setPreventKeyDownEvent(false);
        }}
        isOpen={isEditLevelOpen}
        level={level}
      />
    }
    {canEdit && <>
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
    </>}
  </>);
}
