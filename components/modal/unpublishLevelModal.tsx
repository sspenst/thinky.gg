import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import { TimerUtil } from '../../helpers/getTs';
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
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setIsLoading(isUnpublishing);
  }, [isUnpublishing, setIsLoading]);

  function onConfirm() {
    setIsUnpublishing(true);
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

  const archive = level.ts < TimerUtil.getTs() - 24 * 60 * 60;

  return (
    <Modal
      closeModal={closeModal}
      disabled={isUnpublishing}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={`${archive ? 'Archive' : 'Unpublish'} Level`}
    >
      <div style={{ textAlign: 'center' }}>
        {`Are you sure you want to ${archive ? 'archive' : 'unpublish'} your level '${level.name}'?`}
        <br />
        {archive ?
          'Your level will be moved to the archive account.' :
          'All stats and reviews for this level will be deleted.'
        }
      </div>
    </Modal>
  );
}
