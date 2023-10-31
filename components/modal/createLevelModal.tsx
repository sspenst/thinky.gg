import { useRouter } from 'next/router';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Level from '../../models/db/level';
import Modal from '.';

interface CreateLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function CreateLevelModal({ closeModal, isOpen, level }: CreateLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState<string>('');
  const router = useRouter();

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
          className='p-1 rounded-md border border-color-4'
          name='name'
          onChange={e => setName(e.target.value)}
          placeholder={'Add name...'}
          required
          type='text'
          value={name}
        />
        <label className='font-semibold' htmlFor='authorNote'>Author Note:</label>
        <textarea
          className='p-1 rounded-md border border-color-4'
          name='authorNote'
          onChange={e => setAuthorNote(e.target.value)}
          placeholder={'Add optional author note...'}
          rows={4}
          value={authorNote}
        />
      </div>
    </Modal>
  );
}
