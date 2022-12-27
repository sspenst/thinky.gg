import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import Collection from '../../models/db/collection';
import Modal from '.';

interface AddCollectionModalProps {
  closeModal: () => void;
  collection?: Collection;
  isOpen: boolean;
}

export default function AddCollectionModal({ closeModal, collection, isOpen }: AddCollectionModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    setAuthorNote(collection?.authorNote);
    setName(collection?.name);
  }, [collection]);

  function onSubmit() {
    if (!name || name.length === 0) {
      toast.dismiss();
      toast.error('Error: Name is required', {
        duration: 3000
      });

      return;
    }

    if (name.length > 50) {
      toast.dismiss();
      toast.error('Error: Name cannot be longer than 50 characters', {
        duration: 3000,
      });

      return;
    }

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
    }).then(async res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success(collection ? 'Updated' : 'Added');
        closeModal();

        const newCollection = await res.json();

        router.push(`/collection/${newCollection.slug}`);
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    }).finally(() => {
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
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <label className='font-semibold' htmlFor='name'>Name:</label>
        <input
          className='p-1 rounded-md text-black border'
          name='name'
          onChange={e => setName(e.target.value)}
          placeholder={`${collection ? 'Edit' : 'Add'} name...`}
          required
          type='text'
          value={name}
        />
        <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
        <textarea
          className='p-1 rounded-md text-black border'
          name='authorNote'
          onChange={e => setAuthorNote(e.target.value)}
          placeholder={`${collection ? 'Edit' : 'Add'} author note...`}
          rows={4}
          value={authorNote}
        />
      </div>
    </Modal>
  );
}
