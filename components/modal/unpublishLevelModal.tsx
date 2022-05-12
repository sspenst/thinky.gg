import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface UnpublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function UnpublishLevelModal({ closeModal, isOpen, level }: UnpublishLevelModalProps) {
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    setIsLoading(true);

    fetch(`/api/unpublish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    })
    .then(res => {
      if (res.status === 200) {
        closeModal();
        mutateStats();
        mutateUser();
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error unpublishing level');
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Unpublish Level'}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to unpublish your level '${level.name}'?`}
        <br/>
        {'All stats and reviews for this level will be deleted.'}
      </div>
    </Modal>
  );
}
