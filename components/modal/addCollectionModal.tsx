import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Collection from '../../models/db/collection';
import isNotFullAccountToast from '../toasts/isNotFullAccountToast';
import Modal from '.';

interface AddCollectionModalProps {
  closeModal: () => void;
  collection?: Collection;
  isOpen: boolean;
}

export default function AddCollectionModal({ closeModal, collection, isOpen }: AddCollectionModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [isPrivate, setIsPrivate] = useState(false);
  const [name, setName] = useState<string>();
  const router = useRouter();
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (collection) {
      setAuthorNote(collection.authorNote);
      setIsPrivate(!!collection.isPrivate);
      setName(collection.name);
    }
  }, [collection]);

  function onSubmit() {
    if (!name || name.length === 0) {
      toast.dismiss();
      toast.error('Error: Name is required', {
        duration: 3000,
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

    toast.dismiss();
    toast.loading(collection ? 'Updating collection...' : 'Adding collection...');

    fetch(collection ? `/api/collection/${collection._id}` : '/api/collection', {
      method: collection ? 'PUT' : 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        isPrivate: isPrivate,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 401) {
        isNotFullAccountToast('Creating a collection');
      } else if (res.status === 200) {
        toast.dismiss();
        toast.success(collection ? 'Updated' : 'Added');
        closeModal();

        const newCollection = await res.json();

        if (collection) {
          router.replace(`/collection/${newCollection.slug}`);
        } else {
          router.push(`/collection/${newCollection.slug}`);
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
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
          className='p-1 rounded-md border border-color-4'
          name='name'
          onChange={e => setName(e.target.value)}
          placeholder={`${collection ? 'Edit' : 'Add'} name...`}
          required
          type='text'
          value={name}
        />
        <div className='flex items-center gap-2'>
          {!isPro(user) &&
            <Link href='/pro'>
              <Image alt='pro' src='/pro.svg' width={16} height={16} style={{ minWidth: 16, minHeight: 16 }} />
            </Link>
          }
          <label htmlFor='privateCollection' className='font-semibold'>
            Private:
          </label>
          <input
            checked={isPrivate}
            id='privateCollection'
            onChange={() => setIsPrivate(p => !p)}
            type='checkbox'
          />
        </div>
        <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
        <textarea
          className='p-1 rounded-md border border-color-4'
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
