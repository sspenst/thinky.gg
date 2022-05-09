import LevelDataType from '../../constants/levelDataType';
import Modal from '.';
import RadioButton from '../radioButton';
import React from 'react';

interface LevelDataTypeModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelDataType: LevelDataType;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LevelDataTypeModal({ closeModal, isOpen, levelDataType, onChange }: LevelDataTypeModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Choose Active Block Type'}
    >
      <>
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Default'}
          value={LevelDataType.Default}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Start'}
          value={LevelDataType.Start}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'End'}
          value={LevelDataType.End}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Wall'}
          value={LevelDataType.Wall}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Block'}
          value={LevelDataType.Block}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Hole'}
          value={LevelDataType.Hole}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Left'}
          value={LevelDataType.Left}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Up'}
          value={LevelDataType.Up}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Right'}
          value={LevelDataType.Right}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Down'}
          value={LevelDataType.Down}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Up Left'}
          value={LevelDataType.Upleft}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Up Right'}
          value={LevelDataType.Upright}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Down Right'}
          value={LevelDataType.Downright}
        />
        <RadioButton
          currentValue={levelDataType.toString()}
          name={'levelDataType'}
          onChange={onChange}
          text={'Down Left'}
          value={LevelDataType.Downleft}
        />
      </>
    </Modal>
  );
}
