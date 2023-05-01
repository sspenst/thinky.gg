import { Types } from 'mongoose';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppContext } from '../../contexts/appContext';
import isCurator from '../../helpers/isCurator';
import naturalSort from '../../helpers/naturalSort';
import Collection from '../../models/db/collection';
import Level from '../../models/db/level';
import Modal from '.';

interface EditLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function EditLevelModal({ closeModal, isOpen, level }: EditLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>('');
  const [collections, setCollections] = useState<Collection[]>();
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState<string>('');
  const router = useRouter();
  const { shouldAttemptAuth, user } = useContext(AppContext);

  const getCollections = useCallback(() => {
    if (isOpen && shouldAttemptAuth) {
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
  }, [isOpen, shouldAttemptAuth]);

  useEffect(() => {
    getCollections();
  }, [getCollections]);

  useEffect(() => {
    setAuthorNote(level.authorNote ?? '');
    setName(level.name);
  }, [level]);

  useEffect(() => {
    if (!collections) {
      setCollectionIds([]);
    } else {
      const newCollectionIds = [];

      for (let i = 0; i < collections.length; i++) {
        const levels = collections[i].levels as Types.ObjectId[];

        if (levels.includes(level._id)) {
          newCollectionIds.push(collections[i]._id.toString());
        }
      }

      setCollectionIds(newCollectionIds);
    }
  }, [collections, level]);

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
    toast.loading('Updating level...');

    fetch(`/api/level/${level._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        authorNote: authorNote,
        collectionIds: collectionIds,
        name: name,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Updated');
        closeModal();

        const newLevel = await res.json();

        if (newLevel) {
          if (!newLevel.isDraft) {
            router.replace(`/level/${newLevel.slug}`);
          } else {
            router.reload();
          }
        }
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

  const isUsersLevel = level.userId?._id === user?._id || level.userId === user?._id || isCurator(user);

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={!isUsersLevel ? 'Add to...' : 'Edit Level'}
    >
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        {isUsersLevel && <>
          <label className='font-semibold' htmlFor='name'>Name:</label>
          <input
            className='p-1 rounded-md text-black border'
            name='name'
            onChange={e => setName(e.target.value)}
            placeholder={'Edit name...'}
            required
            type='text'
            value={name}
          />
          <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
          <textarea
            className='p-1 rounded-md text-black border'
            name='authorNote'
            onChange={e => setAuthorNote(e.target.value)}
            placeholder={'Edit optional author note...'}
            rows={4}
            value={authorNote}
          />
        </>}
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
                      {collection.name}
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
