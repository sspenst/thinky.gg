import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';
import Collection from '../../models/db/collection';
import Modal from '.';

interface DeleteCollectionModalProps {
  closeModal: () => void;
  collection: Collection;
  isOpen: boolean;
}

export default function DeleteCollectionModal({ collection, closeModal, isOpen }: DeleteCollectionModalProps) {
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    setIsLoading(true);
    toast.loading('Deleting collection...');
    fetch(`/api/collection/${collection._id}`, {
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
      console.trace(err);
      toast.dismiss();
      toast.error('Error deleting collection');
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
      title={'Delete Collection'}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to delete your collection '${collection.name}'?`}
        <br/>
        {'Levels within this collection will not be deleted.'}
      </div>
    </Modal>
  );
}
