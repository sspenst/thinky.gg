import { useRouter } from 'next/router';
import { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';

interface UnpublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function UnpublishLevelModal({ closeModal, isOpen, level }: UnpublishLevelModalProps) {
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const { mutateUser } = useContext(AppContext);
  const router = useRouter();

  function onConfirm() {
    setIsUnpublishing(true);
    toast.dismiss();
    toast.loading('Unpublishing...');

    fetch(`/api/unpublish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
    }).then(async res => {
      if (res.status === 200) {
        closeModal();
        mutateUser();

        const { levelId } = await res.json();

        toast.dismiss();
        toast.success('Unpublished');

        router.replace(`/edit/${levelId}`);
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
      <div className='break-words text-center'>
        {`Are you sure you want to unpublish '${level.name}'?`}
        <br />
        {'All stats and reviews for this level will be deleted.'}
      </div>
    </Modal>
  );
}
