import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { LevelContext } from '../../contexts/levelContext';
import Modal from '.';

interface DeleteReviewModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function DeleteReviewModal({ closeModal, isOpen }: DeleteReviewModalProps) {
  const levelContext = useContext(LevelContext);

  function onConfirm() {
    toast.dismiss();
    toast.loading('Deleting review...');

    fetch(`/api/review/${levelContext?.level._id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        toast.dismiss();
        toast.success('Deleted');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error deleting review');
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Delete Review'}
    >
      <div style={{ textAlign: 'center' }}>
        {'Are you sure you want to delete your review?'}
      </div>
    </Modal>
  );
}
