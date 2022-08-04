import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Collection from '../../models/db/collection';
import Modal from '.';
import toast from 'react-hot-toast';
import useTextAreaWidth from '../../hooks/useTextAreaWidth';

interface AddCollectionModalProps {
  closeModal: () => void;
  collection: Collection | undefined;
  isOpen: boolean;
}

export default function AddCollectionModal({ closeModal, isOpen, collection }: AddCollectionModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setAuthorNote(collection?.authorNote);
    setName(collection?.name);
  }, [collection]);

  function onSubmit() {
    setIsLoading(true);
    toast.loading(collection ? 'Updating collection...' : 'Adding collection...');

    fetch(collection ? `/api/collection/${collection._id}` : '/api/collection', {
      method: collection ? 'PUT' : 'POST',
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
      toast.dismiss();
      toast.error('Error adding collection');
    }).finally(() => {
      toast.dismiss();
      toast.success(collection ? 'Updated' : 'Added');
      setIsLoading(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={`${collection ? 'Edit' : 'New'} Collection`}
    >
      <>
        <div>
          <label htmlFor='name'>Name:</label>
          <input
            name='name'
            onChange={e => setName(e.target.value)}
            placeholder={`${collection ? 'Edit' : 'Add'} name...`}
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
            placeholder={`${collection ? 'Edit' : 'Add'} author note...`}
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
