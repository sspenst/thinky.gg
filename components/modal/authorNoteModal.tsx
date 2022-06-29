import Modal from '.';
import React from 'react';
import cleanAuthorNote from '../../helpers/cleanAuthorNote';

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
      <span style={{ whiteSpace: 'pre-wrap' }}>
        {cleanAuthorNote(authorNote)}
      </span>
    </Modal>
  );
}
