import Modal from '.';
import React from 'react';

interface AboutModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function AboutModal({ closeModal, isOpen }: AboutModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'About'}
    >
      <>
        <span>
          {'Pathology is a recreation of '}
          <a
            className='underline'
            href='https://k2xl.com'
            rel='noreferrer'
            target='_blank'
          >
            k2xl
          </a>
          {'\'s Psychopath 2.'}
        </span>
        <br/>
        <span>
          {'Discuss the game on the '}
          <a
            className='underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            Pathology Discord
          </a>
          .
        </span>
        <br/>
        <span>
          {'Pathology is open source! Check out the code on '}
          <a
            className='underline'
            href='https://github.com/sspenst/pathology'
            rel='noreferrer'
            target='_blank'
          >
            GitHub
          </a>
          .
        </span>
        <br/>
        <span>
          {'Please '}
          <a
            className='underline'
            href='mailto:spencerspenst@gmail.com'
          >
            contact me
          </a>
          {' if you have any feedback!'}
        </span>
      </>
    </Modal>
  );
}
