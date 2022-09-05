import React from 'react';
import Level from '../../models/db/level';
import FormattedLevelInfo from '../formattedLevelInfo';
import Modal from '.';

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
