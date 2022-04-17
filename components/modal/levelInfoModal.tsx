import Level from '../../models/db/level';
import Modal from '.';
import React from 'react';
import User from '../../models/db/user';
import getFormattedDate from '../../helpers/getFormattedDate';

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
      <div>
        <span className='font-bold'>Name:</span> {level.name}
        <br/>
        <span className='font-bold'>Creator:</span> {(level.userId as unknown as User).name}
        <br/>
        {level.ts ?
          <>
            <span className='font-bold'>Created:</span> {getFormattedDate(level.ts)}
            <br/>
          </>
        : null}
        {level.points ?
          <>
            <span className='font-bold'>Points:</span> {level.points}
            <br/>
          </>
        : null}
        <span className='font-bold'>Least moves:</span> {level.leastMoves}
        <br/>
      </div>
    </Modal>
  );
}
