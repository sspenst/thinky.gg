import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';

interface ArchiveLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function ArchiveLevelModal({ closeModal, isOpen, level }: ArchiveLevelModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const { mutateUser } = useContext(AppContext);
  const router = useRouter();

  function onConfirm() {
    setIsArchiving(true);
    toast.dismiss();
    toast.loading('Archiving...');

    fetch(`/api/archive/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    }).then(async res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();

        toast.dismiss();
        toast.success('Archived');

        const newLevel = await res.json();

        router.replace(`/level/${newLevel.slug}`);
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
      <div className='break-words' style={{ textAlign: 'center' }}>
        {`Are you sure you want to archive your level '${level.name}'?`}
        <br />
        {'Your level will be moved to the Archive account.'}
      </div>
    </Modal>
  );
}
