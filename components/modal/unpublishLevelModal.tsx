import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import Modal from '.';

interface UnpublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onUnpublish: () => void;

}

export default function UnpublishLevelModal({ closeModal, isOpen, level, onUnpublish }: UnpublishLevelModalProps) {
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const { mutateUser } = useContext(PageContext);

  function onConfirm() {
    setIsUnpublishing(true);
    toast.dismiss();
    toast.loading('Unpublishing...');

    fetch(`/api/unpublish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        onUnpublish();
        mutateUser();

        toast.dismiss();
        toast.success('Unpublished');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error unpublishing level');
    }).finally(() => {
      setIsUnpublishing(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isUnpublishing}
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
