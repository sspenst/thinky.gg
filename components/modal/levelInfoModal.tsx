import FormattedLevelInfo from '../formattedLevelInfo';
import Level from '../../models/db/level';
import Modal from '.';
import React from 'react';

interface LevelInfoModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function LevelInfoModal({ closeModal, isOpen, level }: LevelInfoModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Level Info'}
    >
      <FormattedLevelInfo level={level} />
    </Modal>
  );
}
