import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import { Types } from 'mongoose';
import World from '../../models/db/world';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import toast from 'react-hot-toast';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onPublish: () => void;
  worlds: World[] | undefined;
}

export default function PublishLevelModal({
  closeModal,
  isOpen,
  level,
  onPublish,
  worlds,
}: PublishLevelModalProps) {
  const { mutateStats } = useStats();
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
        mutateStats();
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

  const worldDivs: JSX.Element[] = [];

  if (worlds) {
    for (let i = 0; i < worlds.length; i++) {
      const levels = worlds[i].levels as Types.ObjectId[];

      if (levels.includes(level._id)) {
        worldDivs.push(<div key={i}>{worlds[i].name}</div>);
      }
    }
  }

  if (worldDivs.length === 0) {
    worldDivs.push(<div>None</div>);
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
          <div className='mt-4'>
            <span className='font-bold'>Worlds:</span>
            {worldDivs}
          </div>
        </div>
      </>
    </Modal>
  );
}
