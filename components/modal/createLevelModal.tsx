import { useRouter } from 'next/router';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Level from '../../models/db/level';
import Modal from '.';

interface CreateLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onLevelCreated?: (levelId: string) => void;
}

export default function CreateLevelModal({ closeModal, isOpen, level, onLevelCreated }: CreateLevelModalProps) {
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
        
        const { _id } = await res.json();
        
        // Call the callback if provided (for pending solutions)
        if (onLevelCreated) {
          onLevelCreated(_id);
        }
        
        closeModal();
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
      title='Save Draft Level'
    >
      <div className='flex flex-col gap-6 w-112 max-w-full'>
        <div>
          <label className='block text-sm font-medium mb-2' htmlFor='name'>Name</label>
          <input
            className='w-full'
            name='name'
            onChange={e => setName(e.target.value)}
            placeholder='Name'
            required
            type='text'
            value={name}
          />
        </div>
        <div>
          <label className='block text-sm font-medium mb-2' htmlFor='authorNote'>Author note</label>
          <textarea
            className='w-full'
            name='authorNote'
            onChange={e => setAuthorNote(e.target.value)}
            placeholder='Optional author note'
            rows={4}
            value={authorNote}
          />
        </div>
      </div>
    </Modal>
  );
}
