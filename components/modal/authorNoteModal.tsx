import Modal from '.';
import React from 'react';
import cleanAuthorNote from '../../helpers/cleanAuthorNote';
interface AuthorNoteModalProps {
  authorNote: string;
  closeModal: () => void;
  isOpen: boolean;
}


export default function AuthorNoteModal({ authorNote, closeModal, isOpen }: AuthorNoteModalProps) {
  const authorNoteWithoutTags = cleanAuthorNote(authorNote);

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
