import Modal from '.';
import React from 'react';

interface AuthorNoteModalProps {
  authorNote: string;
  closeModal: () => void;
  isOpen: boolean;
}

export default function AuthorNoteModal({ authorNote, closeModal, isOpen }: AuthorNoteModalProps) {
  const authorNoteWithoutTags = authorNote.replace(/<\/?[^>]+>/g, '');

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Author Note'}
    >
      <span style={{whiteSpace: 'pre-wrap'}}>{authorNoteWithoutTags}</span>
    </Modal>
  );
}
