import React from 'react';
import { EnrichedLevel } from '../../models/db/level';
import FormattedLevelInfo from '../level/info/formattedLevelInfo';
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
      <div>
        <FormattedLevelInfo level={level} />
      </div>
    </Modal>
  );
}
