import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function PublishLevelModal({ closeModal, isOpen, level }: PublishLevelModalProps) {
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    setIsLoading(true);

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 200) {
        closeModal();
        mutateStats();
        mutateUser();
      } else {
        alert(await res.text());
      }
    }).catch(err => {
      console.error(err);
      alert('Error publishing level');
    }).finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Publish Level'}
    >
      <div>
        <span className='font-bold'>Name:</span> {level.name}
        <br/>
        <span className='font-bold'>Difficulty:</span> {level.points}
        <br/>
        <span className='font-bold'>Moves:</span> {level.leastMoves}
        {!level.authorNote ? null : <>
          <br/>
          <span className='font-bold'>Author Note:</span> {level.authorNote}
        </>}
      </div>
    </Modal>
  );
}
