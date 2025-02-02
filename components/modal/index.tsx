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
        className='fixed inset-0 z-20 overflow-y-auto backdrop-blur-sm'
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
          <div className='fixed inset-0' />
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
              <DialogPanel className={classNames('py-3 px-4 my-8 text-left align-middle transition-all transform shadow-xl rounded-xl flex flex-col gap-4 border bg-1 border-color-3 overflow-hidden', getFontFromGameId(game.id))}>
                <DialogTitle as='div' className='flex gap-4 text-center'>
                  <span className='w-6' />
                  <span className='grow text-xl font-semibold truncate'>{title}</span>
                  <button className='hover:opacity-100 opacity-50 closeBtn' onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                    e.preventDefault();
                    closeModal();
                  }} tabIndex={-1}>
                    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </DialogTitle>
                <div className='px-2 py-1'>
                  {children}
                </div>
                <div className='flex justify-center gap-2 flex-wrap'>
                  {onConfirm ?
                    <>
                      <ModalButton className='bg-blue-500 hover:bg-blue-700' disabled={disabled} onClick={() => {}} text={submitLabel || 'OK'} type='submit' />
                      <ModalButton disabled={disabled} onClick={closeModal} text={closeLabel || 'Cancel'} />
                    </>
                    : onSubmit ?
                      <>
                        <ModalButton className='bg-blue-500 hover:bg-blue-700' disabled={disabled} onClick={() => {}} text={submitLabel || 'Submit'} type='submit' />
                        <ModalButton disabled={disabled} onClick={(e) => {
                          e?.preventDefault();
                          closeModal();
                        }} text={closeLabel || 'Cancel'} />
                      </>
                      :
                      <ModalButton disabled={disabled} onClick={(e) => {
                        e?.preventDefault();
                        closeModal();
                      }} text={closeLabel || 'Close'} />
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
