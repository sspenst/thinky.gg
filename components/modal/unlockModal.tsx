import React from 'react';
import Modal from '.';

interface UnlockModalProps {
  closeModal: () => void;
  isOpen: boolean;
  onConfirm: () => void;
}

export default function UnlockModal({ closeModal, isOpen, onConfirm }: UnlockModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Unlock'}
    >
      <span>
        It is strongly recommended that you follow the given unlock rules. Are you sure you want to continue?
      </span>
    </Modal>
  );
}
