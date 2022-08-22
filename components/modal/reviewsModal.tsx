import React from 'react';
import FormattedLevelReviews from '../formattedLevelReviews';
import Modal from '.';

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
      <FormattedLevelReviews />
    </Modal>
  );
}
