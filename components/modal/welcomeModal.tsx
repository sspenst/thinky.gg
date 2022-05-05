import Link from 'next/link';
import Modal from '.';
import React from 'react';

interface WelcomeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function WelcomeModal({ closeModal, isOpen }: WelcomeModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Welcome to Pathology!'}
    >
      <span>
        {'If you are a returning Psychopath user feel free to jump in and browse the full catalog of levels, but if you are new to the game the best way to start is with the '}
        <Link href={`/world/61ff23c45125afd1d9c0fc4c`} passHref>
          <a className='font-bold underline'>
            Psychopath Tutorial
          </a>
        </Link>
        {'. If you get stuck or want to discuss anything related to Pathology, feel free to join the '}
        <a
          className='font-bold underline'
          href='https://discord.gg/j6RxRdqq4A'
          rel='noreferrer'
          target='_blank'
        >
          Pathology Discord
        </a>
        {'. Have fun!'}
      </span>
    </Modal>
  );
}
