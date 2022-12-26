import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import Level from '../../models/db/level';
import formattedAuthorNote from '../formattedAuthorNote';
import Modal from '.';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onPublish: () => void;
}

export default function PublishLevelModal({ closeModal, isOpen, level, onPublish }: PublishLevelModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const { mutateUser } = useContext(PageContext);
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setIsLoading(isPublishing);
  }, [isPublishing, setIsLoading]);

  function onConfirm() {
    setIsPublishing(true);
    toast.loading('Publishing level...');

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 200) {
        closeModal();
        onPublish();
        mutateUser();

        toast.dismiss();
        toast.success('Published');
      } else {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp.error);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error publishing level');
    }).finally(() => {
      setIsPublishing(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isPublishing}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Publish Level'}
    >
      <>
        <div>
          <span className='font-bold'>Name:</span> {level.name}
          <br />
          <span className='font-bold'>Moves:</span> {level.leastMoves}
          {!level.authorNote ? null :
            <div className='mt-4'>
              <span className='font-bold'>Author Note:</span>
              <br />
              {formattedAuthorNote(level.authorNote)}
            </div>
          }
        </div>
      </>
    </Modal>
  );
}
