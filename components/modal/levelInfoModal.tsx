import React from 'react';
import { EnrichedLevel } from '../../pages/search';
import FormattedLevelInfo from '../formattedLevelInfo';
import Modal from '.';

interface LevelInfoModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: EnrichedLevel;
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
