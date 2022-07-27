import FormattedLevelReviews from '../formattedLevelReviews';
import Modal from '.';
import React from 'react';

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ReviewsModal({ closeModal, isOpen }: ReviewsModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Reviews'}
    >
      <FormattedLevelReviews/>
    </Modal>
  );
}
