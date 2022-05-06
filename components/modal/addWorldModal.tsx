import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';
import World from '../../models/db/world';

interface AddWorldModalProps {
  closeModal: () => void;
  isOpen: boolean;
  world: World | undefined;
}

export default function AddWorldModal({ closeModal, isOpen, world }: AddWorldModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const { windowSize } = useContext(PageContext);
  // magic number to account for modal padding and margin
  const maxTextAreaWidth = windowSize.width - 82;
  const textAreaWidth = maxTextAreaWidth < 500 ? maxTextAreaWidth : 500;

  useEffect(() => {
    setAuthorNote(world?.authorNote);
    setName(world?.name);
  }, [world]);

  function onSubmit() {
    fetch(world ? `/api/world/${world._id}` : '/api/world', {
      method: world ? 'PUT': 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
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
      alert('Error adding world');
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
        <div style={{padding: '8px 0 0 0'}}>
          <textarea
            onChange={e => setName(e.target.value)}
            placeholder={`${world ? 'Edit' : 'Add'} name...`}
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
            placeholder={`${world ? 'Edit' : 'Add'} author note...`}
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
