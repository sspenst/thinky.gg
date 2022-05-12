import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import React from 'react';
import classNames from 'classnames';
import styles from './Modal.module.css';

interface ModalButtonProps {
  onClick: () => void;
  text: string;
}

function ModalButton({ onClick, text }: ModalButtonProps) {
  return (
    <button
      className={classNames('inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md', styles.button)}
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
  isOpen: boolean;
  onConfirm?: () => void;
  onSubmit?: () => void;
  title: string;
}

export default function Modal({
  children,
  closeModal,
  isOpen,
  onConfirm,
  onSubmit,
  title,
}: ModalProps) {
  const { windowSize } = useContext(PageContext);
  const maxHeight = windowSize.height + Dimensions.MenuHeight;

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
                maxHeight: maxHeight,
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
              <div
                className='mt-4'
                style={{
                  // magic number to account for margin/title/ok button
                  maxHeight: maxHeight - 192,
                  overflowY: 'auto',
                  wordWrap: 'break-word',
                }}
              >
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
                    <ModalButton onClick={onConfirm} text={'OK'} />
                    <ModalButton onClick={closeModal} text={'Cancel'} />
                  </>
                  : onSubmit ?
                    <>
                      <ModalButton onClick={onSubmit} text={'Submit'} />
                      <ModalButton onClick={closeModal} text={'Cancel'} />
                    </>
                    :
                    <ModalButton onClick={closeModal} text={'OK'} />
                }
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
