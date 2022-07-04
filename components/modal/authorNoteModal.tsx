import Modal from '.';
import React from 'react';
import formatAuthorNote from '../../helpers/formatAuthorNote';

interface AuthorNoteModalProps {
  authorNote: string;
  closeModal: () => void;
  isOpen: boolean;
}

export default function AuthorNoteModal({ authorNote, closeModal, isOpen }: AuthorNoteModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Author Note'}
    >
      {formatAuthorNote(authorNote)}
    </Modal>
  );
}
