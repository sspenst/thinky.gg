import Modal from '.';
import React from 'react';
import World from '../../models/db/world';
import useUser from '../../hooks/useUser';

interface DeleteWorldModalProps {
  closeModal: () => void;
  isOpen: boolean;
  world: World;
}

export default function DeleteWorldModal({ closeModal, isOpen, world }: DeleteWorldModalProps) {
  const { mutateUser } = useUser();

  function onConfirm() {
    fetch(`/api/world/${world._id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    .then(res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error deleting world');
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
