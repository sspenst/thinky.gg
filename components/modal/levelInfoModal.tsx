import Level from '../../models/db/level';
import Modal from '.';
import React from 'react';
import getFormattedDate from '../../helpers/getFormattedDate';
import useStats from '../../hooks/useStats';

interface LevelInfoModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function LevelInfoModal({ closeModal, isOpen, level }: LevelInfoModalProps) {
  const { stats } =  useStats();
  const stat = stats?.find(stat => stat.levelId === level._id);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Level Info'}
    >
      <div>
        <span className='font-bold'>Name:</span> {level.name}
        <br/>
        <span className='font-bold'>Universe:</span> {level.userId.name}
        <br/>
        <span className='font-bold'>Created:</span> {getFormattedDate(level.ts)}
        <br/>
        <span className='font-bold'>Points:</span> {level.points}
        <br/>
        <br/>
        <span className='font-bold'>Least moves:</span> {level.leastMoves}
        <br/>
        <span className='font-bold'>Set by:</span> {level.leastMovesUserId.name}
        <br/>
        <span className='font-bold'>On:</span> {getFormattedDate(level.leastMovesTs)}
        {stat ? <>
          <br/>
          <br/>
          <span className='font-bold'>Your least moves:</span> {stat.moves}
          <br/>
          <span className='font-bold'>On:</span> {getFormattedDate(stat.ts)}
          <br/>
          <span className='font-bold'>Your attempts:</span> {stat.attempts}
        </> : null}
      </div>
    </Modal>
  );
}
