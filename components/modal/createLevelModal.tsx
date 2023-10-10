import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import naturalSort from '../../helpers/naturalSort';
import Collection from '../../models/db/collection';
import Level from '../../models/db/level';
import Modal from '.';

interface CreateLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function CreateLevelModal({ closeModal, isOpen, level }: CreateLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>('');
  const [collections, setCollections] = useState<Collection[]>();
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState<string>('');
  const router = useRouter();
  const { user } = useContext(AppContext);

  const getCollections = useCallback(() => {
    if (isOpen) {
      fetch('/api/collections', {
        method: 'GET',
      }).then(async res => {
        if (res.status === 200) {
          setCollections(await res.json());
        } else {
          throw res.text();
        }
      }).catch(err => {
        console.error(err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    getCollections();
  }, [getCollections]);

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

    setIsSubmitting(true);
    toast.dismiss();
    toast.loading('Creating level...');

    fetch('/api/level', {
      method: 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        collectionIds: collectionIds,
        data: level.data,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Created');
        closeModal();

        const { _id } = await res.json();

        router.push(`/edit/${_id}`);
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  function onCollectionIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const collectionId = e.currentTarget.value;

    setCollectionIds(prevCollectionIds => {
      const newCollectionIds = [...prevCollectionIds];
      const index = newCollectionIds.indexOf(collectionId);

      if (index > -1) {
        newCollectionIds.splice(index, 1);
      } else {
        newCollectionIds.push(collectionId);
      }

      return newCollectionIds;
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={'Save Draft Level'}
    >
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <label className='font-semibold' htmlFor='name'>Name:</label>
        <input
          className='p-1 rounded-md border'
          name='name'
          onChange={e => setName(e.target.value)}
          placeholder={'Add name...'}
          required
          type='text'
          value={name}
        />
        <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
        <textarea
          className='p-1 rounded-md border'
          name='authorNote'
          onChange={e => setAuthorNote(e.target.value)}
          placeholder={'Add optional author note...'}
          rows={4}
          value={authorNote}
        />
        {!collections ?
          <div>Loading...</div>
          :
          collections.length === 0 ?
            <>
              <span>You do not have any collections.</span>
              {user && <Link href={`/profile/${user.name}/collections`} className='underline'>Create a collection</Link>}
            </>
            :
            <>
              <span className='font-bold'>Collections:</span>
              <div>
                {(naturalSort(collections) as Collection[]).map(collection => {
                  const collectionId = collection._id.toString();

                  return (
                    <div className='flex flex-row gap-2' key={`collection-${collectionId}`}>
                      <input
                        checked={collectionIds.includes(collectionId)}
                        name='collection'
                        onChange={onCollectionIdChange}
                        type='checkbox'
                        value={collectionId}
                      />
                      <span className='truncate'>{collection.name}</span>
                    </div>
                  );
                })}
              </div>
            </>
        }
      </div>
    </Modal>
  );
}
