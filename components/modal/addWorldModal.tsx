import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Modal from '.';
import World from '../../models/db/world';
import useTextAreaWidth from '../../hooks/useTextAreaWidth';

interface AddWorldModalProps {
  closeModal: () => void;
  isOpen: boolean;
  world: World | undefined;
}

export default function AddWorldModal({ closeModal, isOpen, world }: AddWorldModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setAuthorNote(world?.authorNote);
    setName(world?.name);
  }, [world]);

  function onSubmit() {
    setIsLoading(true);

    fetch(world ? `/api/world/${world._id}` : '/api/world', {
      method: world ? 'PUT' : 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        closeModal();
        setAuthorNote(undefined);
        setName(undefined);
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error adding world');
    }).finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={`${world ? 'Edit' : 'New'} World`}
    >
      <>
        <div>
          <label htmlFor='name'>Name:</label>
          <input
            name='name'
            onChange={e => setName(e.target.value)}
            placeholder={`${world ? 'Edit' : 'Add'} name...`}
            required
            style={{
              color: 'rgb(0, 0, 0)',
              margin: 8,
            }}
            type='text'
            value={name}
          />
        </div>
        <div>
          <label htmlFor='authorNote'>Author Note:</label>
          <br/>
          <textarea
            name='authorNote'
            onChange={e => setAuthorNote(e.target.value)}
            placeholder={`${world ? 'Edit' : 'Add'} author note...`}
            rows={4}
            style={{
              color: 'rgb(0, 0, 0)',
              margin: '8px 0',
              resize: 'none',
              width: useTextAreaWidth(),
            }}
            value={authorNote}
          />
        </div>
      </>
    </Modal>
  );
}
