import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import World from '../../models/db/world';
import useStats from '../../hooks/useStats';
import useUser from '../../hooks/useUser';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onPublish: () => void;
  worlds: World[];
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
  const [worldIds, setWorldIds] = useState<string[]>([]);
  const { setIsLoading } = useContext(AppContext);

  function onConfirm() {
    setIsLoading(true);

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      body: JSON.stringify({
        worldIds: worldIds,
      }),
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
      } else {
        alert(await res.text());
      }
    }).catch(err => {
      console.error(err);
      alert('Error publishing level');
    }).finally(() => {
      setIsLoading(false);
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.currentTarget.checked;
    const worldId = e.currentTarget.value;

    setWorldIds(prevWorldIds => {
      if (checked) {
        if (!(worldId in prevWorldIds)) {
          prevWorldIds.push(worldId);
        }
      } else {
        const index = prevWorldIds.indexOf(worldId);
        if (index > -1) {
          prevWorldIds.splice(index, 1);
        }
      }

      return prevWorldIds;
    });
  }

  const worldDivs: JSX.Element[] = [];

  for (let i = 0; i < worlds.length; i++) {
    worldDivs.push(<div key={i}>
      <input
        name='world'
        onChange={onChange}
        style={{
          margin: '0 10px 0 0',
        }}
        type='checkbox'
        value={worlds[i]._id.toString()}
      />
      {worlds[i].name}
    </div>);
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
          {!level.authorNote ? null : <>
            <br/>
            <span className='font-bold'>Author Note:</span> {level.authorNote}
          </>}
        </div>
        {worldDivs.length === 0 ? null : <div>
          <span className='font-bold'>Worlds:</span>
          {worldDivs}
        </div>}
      </>
    </Modal>
  );
}
