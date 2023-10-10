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
      style={{
        marginRight: 10,
      }}
      type='button'
    >
      {text}
    </button>
  );
}

interface ModalProps {
  children: JSX.Element;
  closeModal: () => void;
  disabled?: boolean;
  isOpen: boolean;
  onConfirm?: () => void;
  onSubmit?: () => void;
  title: string | JSX.Element;
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
              className={classNames('w-full max-w-fit px-6 py-4 my-8 overflow-hidden text-left align-middle transition-all transform shadow-xl rounded-xl', rubik.className)}
              style={{
                backgroundColor: 'var(--bg-color-2)',
                border: '1px solid',
                borderColor: 'var(--bg-color-4)',
                color: 'var(--color)',
              }}
            >
              <div className='absolute top-1 right-1'>
                <button
                  className='inline-flex justify-center px-2 py-1 text-sm font-medium  border border-transparent rounded'
                  onClick={closeModal}
                  tabIndex={-1}
                  type='button'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-x-circle-fill' viewBox='0 0 16 16'>
                    <path d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z' />
                  </svg>
                </button>
              </div>
              <Dialog.Title
                as='div'
                className='text-lg font-bold leading-6'
                style={{
                  textAlign: 'center',
                }}
              >
                {title}
              </Dialog.Title>
              <div className='mt-4'>
                {children}
              </div>
              <div
                className='mt-4'
                style={{
                  textAlign: 'center',
                }}
              >
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
