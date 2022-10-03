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
      <div className='text-center'>
        <div>
          It is strongly recommended that you unlock levels by completing the given requirements.
        </div>
        <div>
          Are you sure you want to unlock all levels?
        </div>
      </div>
    </Modal>
  );
}
