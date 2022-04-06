import Modal from '.';
import React from 'react';

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string | undefined;
}

export default function ReviewsModal({ closeModal, isOpen, levelId }: ReviewsModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Reviews'}
    >
      <>
        Not yet implemented!
        <br/>
        Level id: {levelId}
      </>
    </Modal>
  );
}
