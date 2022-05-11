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
  const [points, setPoints] = useState<number>(0);
  const { windowSize } = useContext(PageContext);
  // magic number to account for modal padding and margin
  const maxTextAreaWidth = windowSize.width - 82;
  const textAreaWidth = maxTextAreaWidth < 500 ? maxTextAreaWidth : 500;

  useEffect(() => {
    if (!level) {
      setAuthorNote(undefined);
      setName(undefined);
      setPoints(0);
      return;
    }

    setAuthorNote(level.authorNote);
    setName(level.name);
    setPoints(level.points)
  }, [level]);

  function onSubmit() {
    // TODO: show an error message for invalid input
    if (points > 10) {
      return;
    }

    fetch(level ? `/api/level/${level._id}` : '/api/level', {
      method: level ? 'PUT': 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
        points: points,
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
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error adding level');
    });
  }

  function onPointsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.currentTarget.value);
    setPoints(isNaN(value) ? 0 : value);
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={`${level ? 'Edit' : 'New'} Level`}
    >
      <>
        <label htmlFor='width'>Points (0-10):</label>
        <input
          name='width'
          onChange={onPointsChange}
          pattern='[0-9]*'
          required
          style={{
            color: 'rgb(0, 0, 0)',
            margin: 8,
          }}
          type='text'
          value={points}
        />
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
