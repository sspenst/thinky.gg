import { Dialog, Transition } from '@headlessui/react';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { rubik } from '../../pages/_app';

interface ModalButtonProps {
  disabled?: boolean;
  onClick: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  text: string;
}

function ModalButton({ disabled, onClick, text }: ModalButtonProps) {
  return (
    <button
      className={classNames('inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md bg-button')}
      disabled={disabled}
      onClick={onClick}
      type='button'
    >
      {text}
    </button>
  );
}

interface ModalProps {
  children: React.ReactNode;
  closeModal: () => void;
  disabled?: boolean;
  isOpen: boolean;
  onConfirm?: () => void;
  onSubmit?: () => void;
  title: React.ReactNode;
}

export default function Modal({
  children,
  closeModal,
  disabled,
  isOpen,
  onConfirm,
  onSubmit,
  title,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as='div'
        className='fixed inset-0 z-20 overflow-y-auto backdrop-blur-sm'
        onClose={closeModal}
      >
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-200'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0' />
        </Transition.Child>
        <div className='flex min-h-full px-4 text-center items-center justify-center'>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
          >
            <Dialog.Panel
              className={classNames('py-3 px-4 my-8 text-left align-middle transition-all transform shadow-xl rounded-xl flex flex-col gap-4', rubik.className)}
              style={{
                backgroundColor: 'var(--bg-color-2)',
                border: '1px solid',
                borderColor: 'var(--bg-color-4)',
                color: 'var(--color)',
                maxWidth: 'min(100%, 768px)'
              }}
            >
              <Dialog.Title as='div' className='flex gap-4 text-center'>
                <span className='w-6' />
                <span className='grow text-xl font-bold truncate'>{title}</span>
                <button className='hover:opacity-100 opacity-50' onClick={closeModal} tabIndex={-1}>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </Dialog.Title>
              {children}
              <div className='flex justify-center gap-2 flex-wrap'>
                {onConfirm ?
                  <>
                    <ModalButton disabled={disabled} onClick={onConfirm} text={'OK'} />
                    <ModalButton disabled={disabled} onClick={closeModal} text={'Cancel'} />
                  </>
                  : onSubmit ?
                    <>
                      <ModalButton disabled={disabled} onClick={onSubmit} text={'Submit'} />
                      <ModalButton disabled={disabled} onClick={closeModal} text={'Cancel'} />
                    </>
                    :
                    <ModalButton disabled={disabled} onClick={closeModal} text={'Close'} />
                }
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
