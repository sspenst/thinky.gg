import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import naturalSort from '../../helpers/naturalSort';
import { CollectionWithLevel } from '../../models/db/collection';
import Level from '../../models/db/level';
import Modal from '.';

interface SaveLevelToModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function SaveLevelToModal({ closeModal, isOpen, level }: SaveLevelToModalProps) {
  const [collections, setCollections] = useState<CollectionWithLevel[]>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shouldAttemptAuth, user } = useContext(AppContext);

  const getCollections = useCallback(() => {
    if (isOpen && shouldAttemptAuth) {
      fetch(`/api/collections?id=${level._id.toString()}`, {
        method: 'GET',
      }).then(async res => {
        if (res.status === 200) {
          const collectionsWithLevel = naturalSort(await res.json()) as CollectionWithLevel[];

          setCollections(collectionsWithLevel);
        } else {
          throw res.text();
        }
      }).catch(err => {
        console.error(err);
      });
    }
  }, [isOpen, level._id, shouldAttemptAuth]);

  useEffect(() => {
    getCollections();
  }, [getCollections]);

  function onSubmit() {
    setIsSubmitting(true);
    toast.dismiss();
    toast.loading('Saving...');

    const collectionIds = collections?.filter(c => c.containsLevel).map(c => c._id.toString()) ?? [];

    fetch(`/api/save-level-to/${level._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        collectionIds: collectionIds,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status !== 200) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Saved');
      closeModal();
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

    setCollections(prevCollections => {
      const newCollections = JSON.parse(JSON.stringify(prevCollections));

      for (const collection of newCollections) {
        if (collection._id.toString() === collectionId) {
          collection.containsLevel = !collection.containsLevel;
        }
      }

      return newCollections;
    });
  }

  if (!user) {
    return null;
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title='Save Level To...'
    >
      <div className='flex flex-col gap-3'>
        {!collections ?
          <div>Loading...</div>
          :
          collections.length === 0 ?
            <span>No collections found!</span>
            :
            <div className='flex flex-col gap-1'>
              {collections.map(collection => {
                const collectionId = collection._id.toString();
                const key = `collection-${collectionId}`;

                return (
                  <div className='flex flex-row gap-2' key={key}>
                    <input
                      checked={collection.containsLevel}
                      id={key}
                      onChange={onCollectionIdChange}
                      type='checkbox'
                      value={collectionId}
                    />
                    <label className='truncate' htmlFor={key}>{collection.name}</label>
                  </div>
                );
              })}
            </div>
        }
        <Link href={`/profile/${user.name}/collections`} className='font-medium hover:underline w-fit'>Create a collection</Link>
      </div>
    </Modal>
  );
}
