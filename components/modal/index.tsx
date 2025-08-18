import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { AppContext } from '@root/contexts/appContext';
import getFontFromGameId from '@root/helpers/getFont';
import classNames from 'classnames';
import React, { Fragment, useContext } from 'react';

interface ModalButtonProps {
  className?: string;
  disabled?: boolean;
  onClick: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  text: string;
  type?: 'submit' | 'button';
}

function ModalButton({ className, disabled, onClick, text, type }: ModalButtonProps) {
  return (
    <button
      className={classNames('inline-flex justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md', className ?? 'bg-button')}
      disabled={disabled}
      onClick={onClick}
      type={type || 'button'}
    >
      {text}
    </button>
  );
}

interface ModalProps {
  children: React.ReactNode;
  closeLabel?: string;
  closeModal: () => void;
  confirmText?: string;
  disabled?: boolean;
  isOpen: boolean;
  onConfirm?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  title: React.ReactNode;
}

export default function Modal({
  children,
  closeLabel,
  closeModal,
  confirmText,
  disabled,
  isOpen,
  onConfirm,
  onSubmit,
  submitLabel,
  title,
}: ModalProps) {
  const { game } = useContext(AppContext);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as='div'
        className='fixed inset-0 z-20 overflow-y-auto'
        onClose={closeModal}
      >
        <TransitionChild
          as={Fragment}
          enter='ease-out duration-200'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/60 backdrop-blur-sm' />
        </TransitionChild>
        <div className='flex min-h-full px-4 text-center items-center justify-center'>
          <TransitionChild
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='ease-in duration-200'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
          >
            <form
              className='flex justify-center overflow-hidden'
              onSubmit={(e) => {
                e.preventDefault();

                if (onSubmit) {
                  onSubmit();
                }

                if (onConfirm) {
                  onConfirm();
                }
              }}
            >
              <DialogPanel className={classNames('relative py-6 px-6 my-8 text-left align-middle transition-all transform shadow-2xl rounded-xl flex flex-col gap-6 border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden max-w-2xl w-full', getFontFromGameId(game.id))}>
                <div className='absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-lg opacity-50' />
                <DialogTitle as='div' className='relative flex gap-4 text-center items-center'>
                  <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center'>
                    <span className='text-2xl text-white'>⚔️</span>
                  </div>
                  <span className='grow text-2xl font-bold'>
                    <span className='bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                      {title}
                    </span>
                  </span>
                  <button className='relative hover:bg-white/10 p-2 rounded-lg transition-colors duration-200' onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                    e.preventDefault();
                    closeModal();
                  }} tabIndex={-1}>
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-6 h-6 text-white/80'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </DialogTitle>
                <div className='relative'>
                  {children}
                </div>
                <div className='relative flex justify-center gap-3 flex-wrap'>
                  {onConfirm ?
                    <>
                      <ModalButton
                        className='group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                        disabled={disabled}
                        onClick={() => {}}
                        text={confirmText || submitLabel || 'Confirm'}
                        type='submit'
                      />
                      <ModalButton
                        className='group relative overflow-hidden bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                        disabled={disabled}
                        onClick={closeModal}
                        text={closeLabel || 'Cancel'}
                      />
                    </>
                    : onSubmit ?
                      <>
                        <ModalButton
                          className='group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                          disabled={disabled}
                          onClick={() => {}}
                          text={submitLabel || 'Submit'}
                          type='submit'
                        />
                        <ModalButton
                          className='group relative overflow-hidden bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                          disabled={disabled}
                          onClick={(e) => {
                            e?.preventDefault();
                            closeModal();
                          }}
                          text={closeLabel || 'Cancel'}
                        />
                      </>
                      :
                      <ModalButton
                        className='group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200'
                        disabled={disabled}
                        onClick={(e) => {
                          e?.preventDefault();
                          closeModal();
                        }}
                        text={closeLabel || 'Close'}
                      />
                  }
                </div>
              </DialogPanel>
            </form>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}