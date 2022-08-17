import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import useUser from '../../hooks/useUser';
import Level from '../../models/db/level';
import Modal from '.';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onPublish: () => void;
}

export default function PublishLevelModal({
  closeModal,
  isOpen,
  level,
  onPublish,
}: PublishLevelModalProps) {
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    toast.loading('Publishing level...');
    setIsLoading(true);

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 200) {
        onPublish();
        closeModal();
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
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={onConfirm}
      title={'Publish Level'}
    >
      <>
        <div>
          <span className='font-bold'>Name:</span> {level.name}
          <br/>
          <span className='font-bold'>Difficulty:</span> {level.points}
          <br/>
          <span className='font-bold'>Moves:</span> {level.leastMoves}
          {!level.authorNote ? null :
            <div className='mt-4'>
              <span className='font-bold'>Author Note:</span>
              <br/>
              {formatAuthorNote(level.authorNote)}
            </div>
          }
        </div>
      </>
    </Modal>
  );
}
