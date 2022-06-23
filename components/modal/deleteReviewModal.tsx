import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import Modal from '.';
import toast from 'react-hot-toast';

interface DeleteReviewModalProps {
  closeModal: () => void;
  isOpen: boolean;
  levelId: string;
}

export default function DeleteReviewModal({ closeModal, isOpen, levelId }: DeleteReviewModalProps) {
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    toast.loading('Deleting review...');
    setIsLoading(true);

    fetch(`/api/review/${levelId}`, {
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
    }).finally(() => {
      setIsLoading(false);
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
