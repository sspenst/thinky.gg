import FormattedLevelReviews from '../formattedLevelReviews';
import Modal from '.';
import React from 'react';

interface ReviewsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string;
}

export default function ReviewsModal({ closeModal, isOpen, levelId }: ReviewsModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Reviews'}
    >
      <FormattedLevelReviews levelId={levelId} />
    </Modal>
  );
}
