import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';

interface AddLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level | undefined;
}

export default function AddLevelModal({ closeModal, isOpen, level }: AddLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const [points, setPoints] = useState<number>(0);
  const { setIsLoading } = useContext(AppContext);
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
    setPoints(level.points);
  }, [level]);

  function onSubmit() {
    // TODO: show an error message for invalid input
    if (points > 10) {
      return;
    }

    setIsLoading(true);

    fetch(level ? `/api/level/${level._id}` : '/api/level', {
      method: level ? 'PUT' : 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
        points: points,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        closeModal();
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error adding level');
    }).finally(() => {
      setIsLoading(false);
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
        <div>
          <label htmlFor='name'>Name:</label>
          <input
            name='name'
            onChange={e => setName(e.target.value)}
            placeholder={`${level ? 'Edit' : 'Add'} name...`}
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
          <label htmlFor='points'>Difficulty (0-10):</label>
          <input
            name='points'
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
        </div>
        <div>
          <label htmlFor='authorNote'>Author Note:</label>
          <br/>
          <textarea
            name='authorNote'
            onChange={e => setAuthorNote(e.target.value)}
            placeholder={`${level ? 'Edit' : 'Add'} author note...`}
            rows={4}
            style={{
              color: 'rgb(0, 0, 0)',
              margin: '8px 0',
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
