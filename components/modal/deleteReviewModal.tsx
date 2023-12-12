import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { LevelContext } from '../../contexts/levelContext';
import Modal from '.';

interface DeleteReviewModalProps {
  closeModal: () => void;
  isOpen: boolean;
  userId: string;
}

export default function DeleteReviewModal({ closeModal, isOpen, userId }: DeleteReviewModalProps) {
  const levelContext = useContext(LevelContext);

  function onConfirm() {
    toast.dismiss();
    toast.loading('Deleting review...');

    fetch(`/api/review/${levelContext?.level._id}?userId=${userId}`, {
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
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error deleting review');
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Delete Review'}
    >
      <div className='text-center'>
        {'Are you sure you want to delete this review?'}
      </div>
    </Modal>
  );
}
