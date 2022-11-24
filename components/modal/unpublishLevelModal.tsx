import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import Modal from '.';

interface UnpublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function UnpublishLevelModal({ closeModal, isOpen, level }: UnpublishLevelModalProps) {
  const { mutateUser } = useContext(PageContext);
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    closeModal();
    setIsLoading(true);
    toast.loading('Unpublishing...');
    fetch(`/api/unpublish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        mutateUser();
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error unpublishing level');
    }).finally(() => {
      toast.dismiss();
      toast.success('Unpublished');
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
        <br />
        {'All stats and reviews for this level will be deleted.'}
      </div>
    </Modal>
  );
}
