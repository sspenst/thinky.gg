import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import useUser from '../../hooks/useUser';
import Level from '../../models/db/level';
import Modal from '.';

interface DeleteLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function DeleteLevelModal({ closeModal, isOpen, level }: DeleteLevelModalProps) {
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    toast.loading('Deleting level...');
    setIsLoading(true);

    fetch(`/api/level/${level._id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error deleting level');
    }).finally(() => {
      toast.dismiss();
      toast.success('Deleted');
      setIsLoading(false);
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
