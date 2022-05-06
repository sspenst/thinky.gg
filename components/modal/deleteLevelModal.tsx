import Level from '../../models/db/level';
import Modal from '.';
import React from 'react';
import useUser from '../../hooks/useUser';

interface DeleteLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function DeleteLevelModal({ closeModal, isOpen, level }: DeleteLevelModalProps) {
  const { mutateUser } = useUser();

  function onConfirm() {
    fetch(`/api/level/${level._id}`, {
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
      alert('Error deleting level');
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Delete Level'}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to delete your level '${level.name}'?`}
        <br/>
        {'All data associated with this level will also be deleted.'}
      </div>
    </Modal>
  );
}
