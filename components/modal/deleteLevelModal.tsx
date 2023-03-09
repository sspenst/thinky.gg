import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import Modal from '.';

interface DeleteLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function DeleteLevelModal({ closeModal, isOpen, level }: DeleteLevelModalProps) {
  const { mutateUser } = useContext(PageContext);
  const router = useRouter();

  function onConfirm() {
    toast.dismiss();
    toast.loading('Deleting level...');

    fetch(`/api/level/${level._id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();
        toast.dismiss();
        toast.success('Deleted');
        router.reload();
      } else {
        throw res.text();
      }
    }).catch(async (err) => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error deleting level');
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
        <br />
        {'All data associated with this level will also be deleted.'}
      </div>
    </Modal>
  );
}
