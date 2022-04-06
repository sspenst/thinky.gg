import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import React from 'react';
import classNames from 'classnames';
import styles from './Modal.module.css';

interface ModalProps {
  children: JSX.Element;
  closeModal: () => void;
  isOpen: boolean;
  title: string;
}

export default function Modal({ children, closeModal, isOpen, title }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as='div'
        className='fixed inset-0 z-10 overflow-y-auto'
        onClose={closeModal}
      >
        <div className='min-h-screen px-4 text-center'>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <Dialog.Overlay className='fixed inset-0' />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className='inline-block h-screen align-middle'
            aria-hidden='true'
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
          >
            <div
              className='inline-block w-full max-w-fit px-6 py-4 my-8 overflow-hidden text-left align-middle transition-all transform shadow-xl rounded-xl'
              style={{
                backgroundColor: 'var(--bg-color-2)',
                border: '1px solid',
                borderColor: 'var(--bg-color-4)',
                color: 'var(--color)',
              }}
            >
              <Dialog.Title
                as='h3'
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
                <button
                  className={classNames('inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md', styles.ok)}
                  onClick={closeModal}
                  type='button'
                >
                  OK
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
