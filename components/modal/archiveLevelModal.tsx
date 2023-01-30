import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import Modal from '.';

interface ArchiveLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onArchive: () => void;

}

export default function ArchiveLevelModal({ closeModal, isOpen, level, onArchive }: ArchiveLevelModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const { mutateUser } = useContext(PageContext);

  function onConfirm() {
    setIsArchiving(true);
    toast.dismiss();
    toast.loading('Archiving...');

    fetch(`/api/archive/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        onArchive();
        mutateUser();

        toast.dismiss();
        toast.success('Archived');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error archiving level');
    }).finally(() => {
      setIsArchiving(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isArchiving}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Archive Level'}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to archive your level '${level.name}'?`}
        <br />
        {'Your level will be moved to the Archive account.'}
      </div>
    </Modal>
  );
}
