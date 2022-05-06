import React, { useContext, useEffect, useState } from 'react';
import Level from '../../models/db/level';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';

interface AddLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level | undefined;
  worldId: string;
}

export default function AddLevelModal({ closeModal, isOpen, level, worldId }: AddLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const { windowSize } = useContext(PageContext);
  // magic number to account for modal padding and margin
  const maxTextAreaWidth = windowSize.width - 82;
  const textAreaWidth = maxTextAreaWidth < 500 ? maxTextAreaWidth : 500;

  useEffect(() => {
    setAuthorNote(level?.authorNote);
    setName(level?.name);
  }, [level]);

  function onSubmit() {
    fetch(level ? `/api/level/${level._id}` : '/api/level', {
      method: level ? 'PUT': 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
        worldId: worldId,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 200) {
        closeModal();
        setAuthorNote(undefined);
        setName(undefined);
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error adding level');
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={`${level ? 'Edit' : 'New'} Level`}
    >
      <>
        <div style={{padding: '8px 0 0 0'}}>
          <textarea
            onChange={e => setName(e.target.value)}
            placeholder={`${level ? 'Edit' : 'Add'} name...`}
            required
            rows={1}
            style={{
              color: 'rgb(0, 0, 0)',
              resize: 'none',
              width: textAreaWidth,
            }}
            value={name}
          />
        </div>
        <div style={{padding: '8px 0 0 0'}}>
          <textarea
            onChange={e => setAuthorNote(e.target.value)}
            placeholder={`${level ? 'Edit' : 'Add'} author note...`}
            rows={4}
            style={{
              color: 'rgb(0, 0, 0)',
              resize: 'none',
              width: textAreaWidth,
            }}
            value={authorNote}
          />
        </div>
      </>
    </Modal>
  );
}
