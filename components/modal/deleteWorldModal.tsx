import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import Modal from '.';
import World from '../../models/db/world';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface DeleteWorldModalProps {
  closeModal: () => void;
  isOpen: boolean;
  world: World;
}

export default function DeleteWorldModal({ closeModal, isOpen, world }: DeleteWorldModalProps) {
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    setIsLoading(true);

    fetch(`/api/world/${world._id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        mutateStats();
        mutateUser();
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error deleting world');
    }).finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Delete World'}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to delete your world '${world.name}'?`}
        <br/>
        {'All data within this world will also be deleted.'}
      </div>
    </Modal>
  );
}
