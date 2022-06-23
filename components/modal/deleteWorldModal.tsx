import React, { useContext } from 'react';

import { AppContext } from '../../contexts/appContext';
import Modal from '.';
import World from '../../models/db/world';
import toast from 'react-hot-toast';
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
    toast.loading('Deleting world...');
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
      toast.dismiss();
      toast.success('Deleted');
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
        {'Levels within this world will not be deleted.'}
      </div>
    </Modal>
  );
}
