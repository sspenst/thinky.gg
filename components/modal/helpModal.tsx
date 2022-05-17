import Modal from '.';
import React from 'react';

interface HelpModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function HelpModal({ closeModal, isOpen }: HelpModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Help'}
    >
      <p>
        W ↑ - Move up
        <br/>
        A ← - Move left
        <br/>
        S ↓ - Move down
        <br/>
        D → - Move right
        <br/>
        R - Restart
        <br/>
        U / Backspace - Undo
      </p>
    </Modal>
  );
}
