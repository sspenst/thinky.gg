import { useRouter } from 'next/router';
import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import Collection from '../../models/db/collection';
import Modal from '.';

interface DeleteCollectionModalProps {
  closeModal: () => void;
  collection: Collection;
  isOpen: boolean;
}

export default function DeleteCollectionModal({ collection, closeModal, isOpen }: DeleteCollectionModalProps) {
  const { mutateUser, user } = useContext(AppContext);
  const router = useRouter();

  function onConfirm() {
    toast.dismiss();
    toast.loading('Deleting collection...');

    fetch(`/api/collection/${collection._id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();

        if (user) {
          router.replace(`/profile/${user.name}/collections`);
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error ?? 'Error deleting collection');
    }).finally(() => {
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
      <div className='break-words text-center'>
        {`Are you sure you want to delete your collection '${collection.name}'?`}
        <br />
        {'Levels within this collection will not be deleted.'}
      </div>
    </Modal>
  );
}
