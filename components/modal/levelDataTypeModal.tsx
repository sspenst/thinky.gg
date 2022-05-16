import LevelDataType from '../../constants/levelDataType';
import Modal from '.';
import RadioButton from '../radioButton';
import React from 'react';
import levelDataTypeToString from '../../constants/levelDataTypeToString';

interface LevelDataTypeModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelDataType: LevelDataType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LevelDataTypeModal({ closeModal, isOpen, levelDataType, onChange }: LevelDataTypeModalProps) {
  const radioButtons = [];

  for (const levelDataTypeKey in levelDataTypeToString) {
    radioButtons.push(
      <RadioButton
        currentValue={levelDataType.toString()}
        key={levelDataTypeKey}
        name={'levelDataType'}
        onChange={onChange}
        text={levelDataTypeToString[levelDataTypeKey]}
        value={levelDataTypeKey}
      />
    );
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Choose Active Block Type'}
    >
      <>
        {radioButtons}
      </>
    </Modal>
  );
}
